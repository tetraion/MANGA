export interface RakutenBookItem {
  title: string
  author: string
  publisherName: string
  salesDate: string
  itemPrice: number
  itemUrl: string
  isbn: string
  reviewCount?: number
  reviewAverage?: number
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

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // レート制限エラーでない場合は即座に失敗
      if (!lastError.message.includes('API rate limit exceeded')) {
        throw lastError;
      }
      
      // 最後の試行の場合は例外を投げる
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // 指数バックオフで待機
      const delayTime = baseDelay * Math.pow(2, attempt);
      await delay(delayTime);
    }
  }
  
  throw lastError!;
}

export async function searchMangaWithRatings(
  title: string, 
  minRating: number = 3.0, 
  minReviewCount: number = 5, 
  targetYear?: string
): Promise<RakutenBookItem[]> {
  const applicationId = process.env.RAKUTEN_APPLICATION_ID
  
  if (!applicationId) {
    throw new Error('RAKUTEN_APPLICATION_ID is not set')
  }

  // パラメータを設定（年指定がある場合は期間も制限）
  const params = new URLSearchParams({
    applicationId,
    title,
    booksGenreId: '001001',
    sort: '-releaseDate',
    hits: '10'
  })

  // 年指定がある場合は販売日期間を追加
  if (targetYear) {
    params.set('salesDateFrom', `${targetYear}-01-01`)
    console.log(`Searching from ${targetYear} for recent releases`)
  }

  const url = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`
  
  return await retryWithBackoff(async () => {
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Rakuten API Error ${response.status}:`, errorText)
      console.error('Request URL:', url)
      
      if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.')
      }
      throw new Error(`Rakuten API error: ${response.status} - ${errorText}`)
    }

    const data: RakutenApiResponse = await response.json()
    const books = data.Items?.map(item => item.Item) || []
    
    // 年指定時（新作モード）は評価基準を緩和
    const isRecentMode = !!targetYear
    const filteredBooks = books.filter(book => {
      const hasGoodRating = book.reviewAverage && book.reviewAverage >= minRating
      const hasEnoughReviews = book.reviewCount && book.reviewCount >= minReviewCount
      
      // 新作モード：レビュー数制限を緩和、評価なしも許可
      if (isRecentMode) {
        return !book.reviewAverage || hasGoodRating
      }
      
      // 通常モード：評価とレビュー数の両方が必要
      return hasGoodRating && hasEnoughReviews
    })

    // 品質スコア計算
    const scoredBooks = filteredBooks.map(book => {
      const rating = book.reviewAverage || 3.0 // 未評価は3.0とみなす
      const reviewCount = book.reviewCount || 1 // 未レビューは1とみなす
      const qualityScore = rating * Math.log10(reviewCount + 1)
      
      return {
        ...book,
        qualityScore
      }
    }).sort((a, b) => b.qualityScore - a.qualityScore)

    
    return scoredBooks.slice(0, 10)
  });
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