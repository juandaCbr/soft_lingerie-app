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
          .select('*, productos(*)')
          .eq('user_id', user.id);
        
        if (!error && data) {
          const formattedCart = data.map(item => ({
            ...item.productos,
            quantity: item.cantidad,
            cart_item_id: item.id // Guardamos el ID del registro en la tabla carrito
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

  // --- FUNCIONES OPTIMIZADAS (Instantáneas) ---

  const addToCart = async (product: any) => {
    // Actualización local inmediata
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });

    // Sincronización en segundo plano si hay usuario
    if (user) {
      const existing = cart.find(item => item.id === product.id);
      if (existing) {
        await supabase.from('carrito').update({ cantidad: existing.quantity + 1 })
          .eq('user_id', user.id).eq('producto_id', product.id);
      } else {
        await supabase.from('carrito').insert([{ user_id: user.id, producto_id: product.id, cantidad: 1 }]);
      }
    }
  };

  const updateQuantity = async (id: number, delta: number) => {
    let newQty = 0;

    // 1. Actualización visual instantánea
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));

    // 2. Sincronización silenciosa con la DB
    if (user) {
      // No usamos await aquí para no bloquear la UI
      supabase.from('carrito')
        .update({ cantidad: Math.max(1, (cart.find(i => i.id === id)?.quantity || 0) + delta) })
        .eq('user_id', user.id)
        .eq('producto_id', id)
        .then(); // Ejecuta en segundo plano
    }
  };

  const removeFromCart = async (id: number) => {
    // 1. Quitar de la vista inmediatamente
    setCart(prev => prev.filter(item => item.id !== id));

    // 2. Borrar de la DB en segundo plano
    if (user) {
      await supabase.from('carrito').delete().eq('user_id', user.id).eq('producto_id', id);
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