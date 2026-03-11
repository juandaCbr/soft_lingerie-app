"use client";

import { useEffect } from 'react';
import toast from 'react-hot-toast';

interface BotonWompiProps {
    montoTotal: number;
    referenciaPedido: string;
    onExito: (datos: any) => void;
}

export default function BotonWompi({ montoTotal, referenciaPedido, onExito }: BotonWompiProps) {

    // Variables de entorno para las llaves
    const PUBLIC_KEY = (process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || "").trim();
    const INTEGRITY_SECRET = (process.env.NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET || "").trim();

    // Funcion de hash SHA-256 manual con tipos explicitos para TypeScript
    const calcularSHA256 = (s: string) => {
        const chrsz = 8;
        const hexcase = 0;

        function safe_add(x: number, y: number) {
            const lsw = (x & 0xFFFF) + (y & 0xFFFF);
            const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        }

        function S(X: number, n: number) { return (X >>> n) | (X << (32 - n)); }
        function R(X: number, n: number) { return (X >>> n); }
        function Ch(x: number, y: number, z: number) { return ((x & y) ^ ((~x) & z)); }
        function Maj(x: number, y: number, z: number) { return ((x & y) ^ (x & z) ^ (y & z)); }
        function Sigma0256(x: number) { return (S(x, 2) ^ S(x, 13) ^ S(x, 22)); }
        function Sigma1256(x: number) { return (S(x, 6) ^ S(x, 11) ^ S(x, 25)); }
        function Gamma0256(x: number) { return (S(x, 7) ^ S(x, 18) ^ R(x, 3)); }
        function Gamma1256(x: number) { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }

        function core_sha256(m: number[], l: number) {
            const K = [
                0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
                0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
                0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
                0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
                0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
                0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
                0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
                0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
            ];
            const HASH = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19];
            const W = new Array(64);
            let a, b, c, d, e, f, g, h, t1, t2;

            m[l >> 5] |= 0x80 << (24 - l % 32);
            m[((l + 64 >> 9) << 4) + 15] = l;

            for (let i = 0; i < m.length; i += 16) {
                a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
                for (let j = 0; j < 64; j++) {
                    if (j < 16) W[j] = m[j + i];
                    else W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
                    t1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
                    t2 = safe_add(Sigma0256(a), Maj(a, b, c));
                    h = g; g = f; f = e; e = safe_add(d, t1); d = c; c = b; b = a; a = safe_add(t1, t2);
                }
                HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]);
                HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
            }
            return HASH;
        }

        function str2binb(str: string) {
            // Se define bin como number[] para solucionar el error de TypeScript
            const bin: number[] = [];
            const mask = (1 << chrsz) - 1;
            for (let i = 0; i < str.length * chrsz; i += chrsz) {
                const index = i >> 5;
                if (!bin[index]) bin[index] = 0;
                bin[index] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
            }
            return bin;
        }

        function binb2hex(binarray: number[]) {
            const hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
            let str = "";
            for (let i = 0; i < binarray.length * 4; i++) {
                str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
                    hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
            }
            return str;
        }

        return binb2hex(core_sha256(str2binb(s), s.length * chrsz));
    };

    const abrirWidgetWompi = () => {
        // @ts-ignore
        if (typeof window.WidgetCheckout === 'undefined') {
            toast.error("Wompi no ha cargado correctamente.");
            return;
        }

        if (!PUBLIC_KEY || !INTEGRITY_SECRET) {
            toast.error("Configuracion de pasarela incompleta en variables de entorno.");
            return;
        }

        const montoEnCentavos = Math.round(montoTotal * 100);
        const moneda = "COP";
        const cadenaParaHash = `${referenciaPedido}${montoEnCentavos}${moneda}${INTEGRITY_SECRET}`;
        const firma = calcularSHA256(cadenaParaHash);

        // @ts-ignore
        const checkout = new window.WidgetCheckout({
            currency: moneda,
            amountInCents: montoEnCentavos,
            reference: referenciaPedido,
            publicKey: PUBLIC_KEY,
            signature: { integrity: firma }
        });

        checkout.open((result: any) => {
            const transaction = result?.transaction;
            if (!transaction) return;

            if (transaction.status === 'APPROVED') {
                onExito(transaction);
            } else if (transaction.status === 'DECLINED') {
                toast.error("El pago fue rechazado por la entidad bancaria.");
            }
        });
    };

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://checkout.wompi.co/widget.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    return (
        <button
            type="button"
            onClick={abrirWidgetWompi}
            className="w-full bg-[#2a2a2a] text-white py-6 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
        >
            Proceder al pago
        </button>
    );
}