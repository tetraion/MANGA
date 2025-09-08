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
        
        const latestInfo = await getLatestVolumeInfo(favorite.series_name)
        
        if (latestInfo) {
          // 既存の同じタイトルがあるかチェック
          const { data: existingVolumes } = await supabase
            .from('volumes')
            .select('*')
            .eq('favorite_id', favorite.id)
            .eq('title', latestInfo.title)

          if (!existingVolumes || existingVolumes.length === 0) {
            // 巻数を抽出
            const volumeNumber = extractVolumeNumber(latestInfo.title)

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
              updateResults.push({
                series_name: favorite.series_name,
                success: false,
                error: volumeError.message
              })
            } else {
              updateResults.push({
                series_name: favorite.series_name,
                success: true,
                new_volume: newVolume
              })
            }
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
  const match = title.match(/(\d+)巻?$/)
  return match ? parseInt(match[1]) : null
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