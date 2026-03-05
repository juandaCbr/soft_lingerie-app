"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase';

const CartContext = createContext<any>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Escuchar el estado de autenticación
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

  // 2. Cargar datos del carrito
  useEffect(() => {
    const loadCart = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('carrito')
          .select('*, productos(*), tallas(*)')
          .eq('user_id', user.id);
        
        if (!error && data) {
          const formattedCart = data.map(item => ({
            ...item.productos,
            quantity: item.cantidad,
            cart_item_id: item.id,
            talla: item.tallas,
            talla_id: item.talla_id
          }));
          setCart(formattedCart);
        }
      } else {
        const savedCart = localStorage.getItem('soft_cart');
        if (savedCart) {
          try { setCart(JSON.parse(savedCart)); } catch (e) { setCart([]); }
        }
      }
      setIsLoaded(true);
    };
    loadCart();
  }, [user]);

  // 3. Persistencia para invitados
  useEffect(() => {
    if (isLoaded && !user) {
      localStorage.setItem('soft_cart', JSON.stringify(cart));
    }
  }, [cart, user, isLoaded]);

  // --- FUNCIONES OPTIMIZADAS ---

  const addToCart = async (product: any, talla?: any, qty: number = 1) => {
    // Identificador único considerando la talla
    const tallaId = talla?.id || null;

    // Actualización local inmediata
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.talla_id === tallaId);
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && item.talla_id === tallaId) 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { ...product, quantity: qty, talla, talla_id: tallaId }];
    });

    // Sincronización en segundo plano si hay usuario
    if (user) {
      const existing = cart.find(item => item.id === product.id && item.talla_id === tallaId);
      if (existing) {
        await supabase.from('carrito')
          .update({ cantidad: existing.quantity + qty })
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
    let newQty = 0;

    // 1. Actualización visual instantánea
    setCart(prev => prev.map(item => {
      if (item.id === id && item.talla_id === tallaId) {
        newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));

    // 2. Sincronización silenciosa con la DB
    if (user) {
      supabase.from('carrito')
        .update({ cantidad: newQty })
        .eq('user_id', user.id)
        .eq('producto_id', id)
        .eq('talla_id', tallaId)
        .then();
    }
  };

  const removeFromCart = async (id: number, tallaId: any = null) => {
    // 1. Quitar de la vista inmediatamente
    setCart(prev => prev.filter(item => !(item.id === id && item.talla_id === tallaId)));

    // 2. Borrar de la DB en segundo plano
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