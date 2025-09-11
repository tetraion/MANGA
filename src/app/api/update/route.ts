import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getLatestVolumeInfo } from '@/lib/rakuten'

export async function POST() {
  try {
    // 全てのお気に入り作品を取得
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('*')

    if (favoritesError) {
      throw favoritesError
    }

    const updateResults = []

    // 各作品の最新情報を取得（レート制限対応で間隔をあける）
    for (let i = 0; i < (favorites || []).length; i++) {
      const favorite = favorites[i]
      try {
        // 楽天API のレート制限対応で1秒待機（最初の作品以外）
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        const latestInfoList = await getLatestVolumeInfo(favorite.series_name)
        
        if (latestInfoList.length > 0) {
          const newVolumes = []
          
          // 著者情報を更新（最初の結果から取得）
          const firstResult = latestInfoList[0]
          if (firstResult.author && !favorite.author_name) {
            console.log(`Updating author for ${favorite.series_name}: ${firstResult.author}`)
            await supabase
              .from('favorites')
              .update({ author_name: firstResult.author })
              .eq('id', favorite.id)
          }
          
          // 最新3件をそれぞれ処理
          for (const latestInfo of latestInfoList) {
            // 巻数を抽出（デバッグ用に常に実行）
            const volumeNumber = extractVolumeNumber(latestInfo.title)
            console.log(`[${favorite.series_name}] "${latestInfo.title}" → volume: ${volumeNumber}`)
            
            // 既存の同じタイトルがあるかチェック
            const { data: existingVolumes } = await supabase
              .from('volumes')
              .select('*')
              .eq('favorite_id', favorite.id)
              .eq('title', latestInfo.title)

            // 既存のボリュームがある場合、volume_numberがnullなら更新
            if (existingVolumes && existingVolumes.length > 0) {
              const existingVolume = existingVolumes[0]
              if (existingVolume.volume_number === null && volumeNumber !== null) {
                console.log(`Updating volume_number for existing volume: ${existingVolume.title} → ${volumeNumber}`)
                await supabase
                  .from('volumes')
                  .update({ volume_number: volumeNumber })
                  .eq('id', existingVolume.id)
              }
            } else if (!existingVolumes || existingVolumes.length === 0) {
              // 日付を正しい形式に変換
              const formattedDate = parseJapaneseDate(latestInfo.salesDate)

              // 新しい巻として追加
              const { data: newVolume, error: volumeError } = await supabase
                .from('volumes')
                .insert([{
                  favorite_id: favorite.id,
                  title: latestInfo.title,
                  volume_number: volumeNumber,
                  release_date: formattedDate,
                  price: latestInfo.itemPrice,
                  rakuten_url: latestInfo.itemUrl
                }])
                .select()
                .single()

              if (volumeError) {
                console.error(`Error adding volume for ${favorite.series_name}:`, volumeError)
              } else {
                newVolumes.push(newVolume)
              }
            }
          }
          
          if (newVolumes.length > 0) {
            updateResults.push({
              series_name: favorite.series_name,
              success: true,
              new_volumes: newVolumes
            })
          } else {
            updateResults.push({
              series_name: favorite.series_name,
              success: true,
              message: 'No new volumes found'
            })
          }
        } else {
          updateResults.push({
            series_name: favorite.series_name,
            success: true,
            message: 'No information found from Rakuten API'
          })
        }
      } catch (error) {
        console.error(`Error updating ${favorite.series_name}:`, error)
        updateResults.push({
          series_name: favorite.series_name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({ 
      message: 'Update completed',
      results: updateResults 
    })
  } catch (error) {
    console.error('Error updating favorites:', error)
    return NextResponse.json(
      { error: 'Failed to update favorites' },
      { status: 500 }
    )
  }
}

function extractVolumeNumber(title: string): number | null {
  // 巻数パターンを優先順位で試行
  const volumePatterns = [
    /(\d+)巻/,           // 「2巻」
    /（(\d+)）/,         // 「（31）」  
    /\((\d+)\)/,         // 「(31)」
    /\s(\d+)\s*$/        // 「キングダム 77」
  ]
  
  for (const pattern of volumePatterns) {
    const match = title.match(pattern)
    if (match) {
      const number = parseInt(match[1])
      if (number > 0 && number < 200) {
        return number
      }
    }
  }
  
  return null
}

function parseJapaneseDate(dateString: string): string | null {
  if (!dateString) return null
  
  // "2018年12月04日" または "2025年10月17日" 形式をパース
  const match = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (match) {
    const year = match[1]
    const month = match[2].padStart(2, '0')
    const day = match[3].padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // "2015年12月09日頃" のように「頃」が付いている場合も処理
  const matchWithApprox = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日頃/)
  if (matchWithApprox) {
    const year = matchWithApprox[1]
    const month = matchWithApprox[2].padStart(2, '0')
    const day = matchWithApprox[3].padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // パースできない場合はnullを返す
  console.warn(`Unable to parse date: ${dateString}`)
  return null
}