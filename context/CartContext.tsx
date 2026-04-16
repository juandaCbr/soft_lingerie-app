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
        try {
          const { data, error } = await supabase
            .from('carrito')
            .select(`
              *, 
              productos(*), 
              tallas(*)
            `)
            .eq('user_id', user.id);
          
          if (!error && data) {
            const { data: stocksTallas } = await supabase
              .from('producto_tallas')
              .select('producto_id, talla_id, stock_talla');

            const formattedCart = data.map(item => {
              const stockEspecifico = stocksTallas?.find(
                s => s.producto_id === item.producto_id && s.talla_id === item.talla_id
              )?.stock_talla;

              return {
                ...item.productos,
                quantity: item.cantidad,
                cart_item_id: item.id,
                talla: item.tallas,
                talla_id: item.talla_id,
                stock_disponible: stockEspecifico ?? item.productos.stock
              };
            });
            setCart(formattedCart);
          }
        } catch (err) {
          console.error("Error cargando carrito:", err);
        }
      } else {
        const savedCart = localStorage.getItem('soft_cart');
        if (savedCart) {
          try { 
            const parsed = JSON.parse(savedCart);
            if (Array.isArray(parsed)) {
              setCart(parsed);
            } else {
              setCart([]);
            }
          } catch (e) { 
            setCart([]); 
          }
        } else {
          // Si no hay nada en localStorage, el carrito debe estar vacío
          setCart([]);
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

  const addToCart = useCallback(async (product: any, talla?: any, qty: number = 1) => {
    const tallaId = talla?.id || null;
    const stockMax = Number(talla?.stock ?? product.stock_disponible ?? product.stock ?? 0);
    const requiereTalla = Array.isArray(product?.producto_tallas) && product.producto_tallas.length > 0;

    if (stockMax <= 0 || (requiereTalla && !tallaId)) {
      return false;
    }

    let agregado = false;
    let cantidadFinal = 0;
    let cantidadInsertar = 0;
    let cantidadPrev = 0;

    setCart(prev => {
      const existing = prev.find(
        item => item.id === product.id && (item.talla_id === tallaId || (!item.talla_id && !tallaId)),
      );

      // Si se agrega por talla, cualquier línea legacy sin talla consume cupo de esa talla.
      const reservadoCompatible = prev
        .filter((item) => {
          if (item.id !== product.id) return false;
          if (tallaId) return item.talla_id === tallaId || !item.talla_id;
          return !item.talla_id;
        })
        .reduce((acc, item) => acc + Number(item.quantity || 0), 0);

      const cupoDisponible = Math.max(0, stockMax - reservadoCompatible);
      const qtyAAgregar = Math.min(Math.max(0, qty), cupoDisponible);

      if (existing) {
        cantidadPrev = Number(existing.quantity || 0);
        const newQty = existing.quantity + qtyAAgregar;
        cantidadFinal = newQty;
        cantidadInsertar = qtyAAgregar;
        agregado = qtyAAgregar > 0;
        return prev.map(item => 
          (item.id === product.id && (item.talla_id === tallaId || (!item.talla_id && !tallaId))) 
            ? { ...item, quantity: newQty }
            : item
        );
      }

      cantidadPrev = 0;
      cantidadFinal = qtyAAgregar;
      cantidadInsertar = qtyAAgregar;
      agregado = qtyAAgregar > 0;
      if (!agregado) return prev;
      return [...prev, { ...product, quantity: qtyAAgregar, talla, talla_id: tallaId, stock_disponible: stockMax }];
    });

    if (user) {
      const existing = cart.find(
        item => item.id === product.id && (item.talla_id === tallaId || (!item.talla_id && !tallaId)),
      );
      if (existing) {
        if (cantidadInsertar <= 0) {
          return agregado;
        }
        const newQty = Number(existing.quantity || 0) + cantidadInsertar;
        await supabase.from('carrito')
          .update({ cantidad: newQty })
          .eq('user_id', user.id)
          .eq('producto_id', product.id)
          .eq(tallaId ? 'talla_id' : 'id', tallaId ? tallaId : existing.cart_item_id); // Ajuste para identificar item
      } else {
        if (cantidadInsertar <= 0) {
          return agregado;
        }
        await supabase.from('carrito').insert([{ 
          user_id: user.id, 
          producto_id: product.id, 
          cantidad: cantidadInsertar,
          talla_id: tallaId
        }]);
      }
    }
    return agregado;
  }, [user, cart]);

  const updateQuantity = useCallback(async (id: number, delta: number, tallaId: any = null) => {
    let finalQty = 0;

    setCart(prev => prev.map(item => {
      if (item.id === id && (item.talla_id === tallaId || (!item.talla_id && !tallaId))) {
        const stockMax = item.stock_disponible ?? 99;
        finalQty = Math.max(1, Math.min(stockMax, item.quantity + delta));
        return { ...item, quantity: finalQty };
      }
      return item;
    }));

    if (user && finalQty > 0) {
      const query = supabase.from('carrito')
        .update({ cantidad: finalQty })
        .eq('user_id', user.id)
        .eq('producto_id', id);
      
      if (tallaId) query.eq('talla_id', tallaId);
      else query.is('talla_id', null);
      
      await query;
    }
  }, [user]);

  const removeFromCart = useCallback(async (id: number, tallaId: any = null) => {
    // 1. Actualizar estado local inmediatamente
    setCart(prev => prev.filter(item => {
      const matchId = item.id === id;
      const matchTalla = (item.talla_id === tallaId) || (!item.talla_id && !tallaId);
      return !(matchId && matchTalla);
    }));

    // 2. Si no hay usuario, localStorage se actualizará por el useEffect
    // 3. Si hay usuario, borrar de la DB
    if (user) {
      const query = supabase.from('carrito')
        .delete()
        .eq('user_id', user.id)
        .eq('producto_id', id);
      
      if (tallaId) query.eq('talla_id', tallaId);
      else query.is('talla_id', null);
      
      await query;
    }
  }, [user]);

  const clearCart = useCallback(async () => {
    setCart([]);
    localStorage.removeItem('soft_cart');
    if (user) {
      await supabase.from('carrito').delete().eq('user_id', user.id);
    }
  }, [user]);

  const totalItems = Array.isArray(cart) ? cart.reduce((acc, item) => acc + (item.quantity || 0), 0) : 0;
  const totalPrice = Array.isArray(cart) ? cart.reduce((acc, item) => acc + (Number(item.precio) || 0) * (item.quantity || 0), 0) : 0;

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