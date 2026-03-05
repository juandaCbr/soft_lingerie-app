"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase';

const CartContext = createContext<any>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        setCart([]);
        localStorage.removeItem('soft_cart');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadCart = async () => {
      if (user) {
        // Traemos el stock_talla específico para cada item del carrito
        const { data, error } = await supabase
          .from('carrito')
          .select(`
            *, 
            productos(*), 
            tallas(*),
            producto_tallas!inner(stock_talla)
          `)
          .eq('user_id', user.id);
        
        if (!error && data) {
          const formattedCart = data.map(item => ({
            ...item.productos,
            quantity: item.cantidad,
            cart_item_id: item.id,
            talla: item.tallas,
            talla_id: item.talla_id,
            stock_disponible: item.producto_tallas?.stock_talla ?? item.productos.stock
          }));
          setCart(formattedCart);
        }
      } else {
        const savedCart = localStorage.getItem('soft_cart');
        if (savedCart) {
          try { 
            const parsed = JSON.parse(savedCart);
            // Para invitados, intentamos refrescar el stock si es posible
            setCart(parsed); 
          } catch (e) { setCart([]); }
        }
      }
      setIsLoaded(true);
    };
    loadCart();
  }, [user]);

  useEffect(() => {
    if (isLoaded && !user) {
      localStorage.setItem('soft_cart', JSON.stringify(cart));
    }
  }, [cart, user, isLoaded]);

  const addToCart = async (product: any, talla?: any, qty: number = 1) => {
    const tallaId = talla?.id || null;
    const stockMax = talla?.stock ?? product.stock;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.talla_id === tallaId);
      if (existing) {
        const newQty = Math.min(stockMax, existing.quantity + qty);
        return prev.map(item => 
          (item.id === product.id && item.talla_id === tallaId) 
            ? { ...item, quantity: newQty } 
            : item
        );
      }
      return [...prev, { ...product, quantity: qty, talla, talla_id: tallaId, stock_disponible: stockMax }];
    });

    if (user) {
      const existing = cart.find(item => item.id === product.id && item.talla_id === tallaId);
      if (existing) {
        const newQty = Math.min(stockMax, existing.quantity + qty);
        await supabase.from('carrito')
          .update({ cantidad: newQty })
          .eq('user_id', user.id)
          .eq('producto_id', product.id)
          .eq('talla_id', tallaId);
      } else {
        await supabase.from('carrito').insert([{ 
          user_id: user.id, 
          producto_id: product.id, 
          cantidad: qty,
          talla_id: tallaId
        }]);
      }
    }
  };

  const updateQuantity = async (id: number, delta: number, tallaId: any = null) => {
    let finalQty = 0;

    setCart(prev => prev.map(item => {
      if (item.id === id && item.talla_id === tallaId) {
        const stockMax = item.stock_disponible ?? 99;
        finalQty = Math.max(1, Math.min(stockMax, item.quantity + delta));
        return { ...item, quantity: finalQty };
      }
      return item;
    }));

    if (user && finalQty > 0) {
      supabase.from('carrito')
        .update({ cantidad: finalQty })
        .eq('user_id', user.id)
        .eq('producto_id', id)
        .eq('talla_id', tallaId)
        .then();
    }
  };

  const removeFromCart = async (id: number, tallaId: any = null) => {
    setCart(prev => prev.filter(item => !(item.id === id && item.talla_id === tallaId)));
    if (user) {
      await supabase.from('carrito')
        .delete()
        .eq('user_id', user.id)
        .eq('producto_id', id)
        .eq('talla_id', tallaId);
    }
  };

  const clearCart = async () => {
    setCart([]);
    localStorage.removeItem('soft_cart');
    if (user) {
      await supabase.from('carrito').delete().eq('user_id', user.id);
    }
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + (Number(item.precio) || 0) * item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      updateQuantity, 
      removeFromCart, 
      clearCart, 
      totalItems, 
      totalPrice 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);