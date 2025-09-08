import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Favorite {
  id: number
  series_name: string
  author_name: string | null
  created_at: string
}

export interface Volume {
  id: number
  favorite_id: number
  title: string
  volume_number: number | null
  release_date: string | null
  price: number | null
  rakuten_url: string | null
  created_at: string
}