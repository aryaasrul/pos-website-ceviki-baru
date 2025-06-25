import { supabase } from './supabase'

export const productService = {
  async getProducts(filters = {}) {
    try {
      let query = supabase
        .from('v_products')
        .select('*')
        .eq('active', true)
        .order('name')

      // Apply filters
      if (filters.category) {
        query = query.eq('category_id', filters.category)
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
      }

      if (filters.inStock) {
        query = query.gt('current_stock', 0)
      }

      const { data, error } = await query
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching products:', error)
      throw error
    }
  },

  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('name')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching categories:', error)
      throw error
    }
  },

  async getProductById(id) {
    try {
      const { data, error } = await supabase
        .from('v_products')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching product:', error)
      throw error
    }
  }
}