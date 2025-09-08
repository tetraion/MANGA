export interface RakutenBookItem {
  title: string
  author: string
  publisherName: string
  salesDate: string
  itemPrice: number
  itemUrl: string
  largeImageUrl: string
  isbn: string
}

export interface RakutenApiResponse {
  Items: Array<{
    Item: RakutenBookItem
  }>
  count: number
  page: number
  first: number
  last: number
  hits: number
  carrier: number
  pageCount: number
}

export async function searchMangaByTitle(title: string): Promise<RakutenBookItem[]> {
  const applicationId = process.env.RAKUTEN_APPLICATION_ID
  
  if (!applicationId) {
    throw new Error('RAKUTEN_APPLICATION_ID is not set')
  }

  const params = new URLSearchParams({
    applicationId,
    title,
    booksGenreId: '001001',  // コミック
    sort: '-releaseDate',  // 発売日降順で最新を取得
    hits: '30'  // より多くの結果を取得してフィルタリング
  })

  const url = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`
  console.log('Rakuten API URL:', url)

  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`Rakuten API HTTP error: ${response.status} ${response.statusText}`)
      
      // 429エラー（Rate Limit）の場合は特別に処理
      if (response.status === 429) {
        console.warn('Rakuten API rate limit exceeded. Please wait before making more requests.')
        throw new Error('API rate limit exceeded. Please try again later.')
      }
      
      throw new Error(`Rakuten API error: ${response.status}`)
    }

    const data: RakutenApiResponse = await response.json()
    console.log(`Rakuten API response for "${title}":`, {
      count: data.count,
      hits: data.hits,
      itemsLength: data.Items?.length || 0,
      firstFewTitles: data.Items?.slice(0, 3).map(item => item.Item.title) || []
    })
    
    return data.Items?.map(item => item.Item) || []
  } catch (error) {
    console.error('Error fetching from Rakuten API:', error)
    throw error
  }
}

export async function getLatestVolumeInfo(seriesName: string): Promise<RakutenBookItem[]> {
  try {
    console.log(`Getting latest volume info for: ${seriesName}`)
    const books = await searchMangaByTitle(seriesName)
    
    if (books.length === 0) {
      console.log(`No books found for: ${seriesName}`)
      return []
    }

    // 検索結果から関連性の高い作品をフィルタリング
    const filteredBooks = books.filter(book => {
      const title = book.title.toLowerCase()
      const searchTerm = seriesName.toLowerCase()
      
      // 完全一致または先頭一致を優先
      if (title === searchTerm || title.startsWith(searchTerm + ' ')) {
        return true
      }
      
      // 作品名が含まれているかチェック
      return title.includes(searchTerm)
    })

    console.log(`Filtered ${books.length} books down to ${filteredBooks.length} for: ${seriesName}`)

    // フィルタリング結果が空の場合は元の結果を使用
    const targetBooks = filteredBooks.length > 0 ? filteredBooks : books

    // 最新の巻数を探す（発売日でソート）
    const sortedBooks = targetBooks.sort((a, b) => 
      new Date(b.salesDate).getTime() - new Date(a.salesDate).getTime()
    )

    // 最新3件を取得
    const results = sortedBooks.slice(0, 3)
    console.log(`Latest volumes for ${seriesName}:`, results.map(r => ({ title: r.title, date: r.salesDate })))
    return results
  } catch (error) {
    console.error('Error getting latest volume info:', error)
    return []
  }
}