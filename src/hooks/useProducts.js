import { useState, useEffect, useCallback } from 'react'
import { productService } from '../services/products'
import toast from 'react-hot-toast'

export function useProducts(filters = {}) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Serialize filters to string to avoid object reference inequality triggering infinite re-renders
  const filtersKey = JSON.stringify(filters)

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await productService.getProducts(JSON.parse(filtersKey))
      setProducts(data)
      setError(null)
    } catch (err) {
      setError(err.message)
      toast.error('Gagal memuat produk')
    } finally {
      setLoading(false)
    }
  }, [filtersKey])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories()
      setCategories(data)
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  const updateStock = async (productId, quantity, type) => {
    try {
      await productService.addStockMovement(productId, quantity, type)
      toast.success('Stok berhasil diperbarui')
      await loadProducts()
    } catch (err) {
      toast.error('Gagal update stok')
      throw err
    }
  }

  return { products, categories, loading, error, refetch: loadProducts, updateStock }
}