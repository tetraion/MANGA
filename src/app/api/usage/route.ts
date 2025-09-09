import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function getUserKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return ip
}

export async function GET(request: NextRequest) {
  try {
    const userKey = getUserKey(request)
    const serviceType = request.nextUrl.searchParams.get('service') as 'recommendations' | 'recent-manga'
    
    if (!serviceType || !['recommendations', 'recent-manga'].includes(serviceType)) {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    }
    
    const today = new Date().toISOString().split('T')[0]
    
    // 今日の使用状況を取得
    const { data: todayData, error } = await supabase
      .from('api_usage')
      .select('daily_count')
      .eq('user_id', userKey)
      .eq('service_type', serviceType)
      .eq('last_used', today)
      .single()
    
    // 今月の合計使用回数を取得
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const { data: monthlyData } = await supabase
      .from('api_usage')
      .select('daily_count')
      .eq('user_id', userKey)
      .eq('service_type', serviceType)
      .gte('last_used', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('last_used', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`)
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    const currentDaily = todayData?.daily_count || 0
    const currentMonthly = monthlyData?.reduce((sum, record) => sum + record.daily_count, 0) || 0
    
    return NextResponse.json({
      daily: currentDaily,
      monthly: currentMonthly
    })
  } catch (error) {
    console.error('Error getting usage data:', error)
    return NextResponse.json({ error: 'Failed to get usage data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userKey = getUserKey(request)
    const { serviceType } = await request.json()
    
    if (!serviceType || !['recommendations', 'recent-manga'].includes(serviceType)) {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    }
    
    const today = new Date().toISOString().split('T')[0]
    const dailyLimit = serviceType === 'recommendations' ? 100 : 20
    const monthlyLimit = serviceType === 'recommendations' ? 3000 : 600
    
    // 今日の使用状況を取得
    const { data: todayData, error: selectError } = await supabase
      .from('api_usage')
      .select('daily_count, monthly_count')
      .eq('user_id', userKey)
      .eq('service_type', serviceType)
      .eq('last_used', today)
      .single()
    
    // 今月の合計使用回数を取得
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const { data: monthlyData } = await supabase
      .from('api_usage')
      .select('daily_count')
      .eq('user_id', userKey)
      .eq('service_type', serviceType)
      .gte('last_used', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('last_used', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`)
    
    const currentDaily = todayData?.daily_count || 0
    const currentMonthly = monthlyData?.reduce((sum, record) => sum + record.daily_count, 0) || 0
    
    // 使用制限チェック
    if (currentDaily >= dailyLimit) {
      return NextResponse.json({
        error: `1日の利用制限（${dailyLimit}回）に達しました。明日再度お試しください。`,
        canUse: false
      }, { status: 429 })
    }
    
    if (currentMonthly >= monthlyLimit) {
      return NextResponse.json({
        error: `月間利用制限（${monthlyLimit}回）に達しました。来月まで お待ちください。`,
        canUse: false
      }, { status: 429 })
    }
    
    // 使用回数を更新（今日のレコードのみ更新、monthly_countは削除）
    if (todayData) {
      // 既存レコードを更新
      const { error: updateError } = await supabase
        .from('api_usage')
        .update({ daily_count: currentDaily + 1 })
        .eq('user_id', userKey)
        .eq('service_type', serviceType)
        .eq('last_used', today)
      
      if (updateError) {
        throw updateError
      }
    } else {
      // 新規レコードを挿入
      const { error: insertError } = await supabase
        .from('api_usage')
        .insert({
          user_id: userKey,
          service_type: serviceType,
          last_used: today,
          daily_count: 1,
          monthly_count: 0  // 使用しない
        })
      
      if (insertError) {
        throw insertError
      }
    }
    
    return NextResponse.json({
      canUse: true,
      daily: currentDaily + 1,
      monthly: currentMonthly + 1
    })
  } catch (error) {
    console.error('Error recording usage:', error)
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 })
  }
}