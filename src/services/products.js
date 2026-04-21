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
  },

  async addStockMovement(productId, quantity, type = 'in', notes = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Trigger update_product_stock otomatis update products.current_stock
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: productId,
          type,
          quantity,
          reference_type: type === 'adjustment' ? 'adjustment' : type === 'in' ? 'stock_in' : 'stock_out',
          notes,
          created_by: user?.id
        })

      if (movementError) throw movementError

      return { success: true }
    } catch (error) {
      console.error('Error adding stock movement:', error)
      throw error
    }
  },

  async createProduct(productData) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...productData, current_stock: 0 })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    }
  },

  async updateProduct(id, productData) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ ...productData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating product:', error)
      throw error
    }
  },

  async deleteProduct(id) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error deleting product:', error)
      throw error
    }
  }
}