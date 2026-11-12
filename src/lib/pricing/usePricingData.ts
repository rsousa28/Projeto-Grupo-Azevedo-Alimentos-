// Leitura em tempo real e gravação da Precificação PRO no Firestore.
// Estrutura: stores/{storeId}/pricing_config/main e uma coleção por tipo de cadastro.
import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { sanitizeForFirestore } from '../../utils/firestoreSanitizer';
import { defaultConfig } from './seed';
import type { BaseRecipe, Combo, Ingredient, Invoice, Packaging, PricingConfig, PricingData, Product, SupplierItemMap } from './types';

export const PRICING_COLLECTIONS = {
  ingredients: 'pricing_ingredients',
  packaging: 'pricing_packaging',
  recipes: 'pricing_recipes',
  products: 'pricing_products',
  combos: 'pricing_combos',
  invoices: 'pricing_invoices',
  itemMaps: 'pricing_item_maps',
} as const;

export type PricingCollection = keyof typeof PRICING_COLLECTIONS;

type ItemOf<K extends PricingCollection> = {
  ingredients: Ingredient;
  packaging: Packaging;
  recipes: BaseRecipe;
  products: Product;
  combos: Combo;
  invoices: Invoice;
  itemMaps: SupplierItemMap;
}[K];

const KEYS = Object.keys(PRICING_COLLECTIONS) as PricingCollection[];
// Cadastros que formam o cardápio (as notas e os vínculos ficam à parte)
const CORE_KEYS: PricingCollection[] = ['ingredients', 'packaging', 'recipes', 'products', 'combos'];

export type PricingWrite = { [K in PricingCollection]: { kind: K; item: ItemOf<K> } }[PricingCollection];

export interface PricingStore {
  storeId: string;
  data: PricingData;
  invoices: Invoice[];
  itemMaps: SupplierItemMap[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  save: <K extends PricingCollection>(kind: K, item: ItemOf<K>) => Promise<void>;
  remove: (kind: PricingCollection, id: string) => Promise<void>;
  saveConfig: (patch: Partial<PricingConfig>) => Promise<void>;
  /** Grava vários cadastros de uma vez (tudo ou nada), ex.: autorizar uma nota fiscal. */
  saveMany: (writes: PricingWrite[]) => Promise<void>;
  importAll: (data: PricingData) => Promise<void>;
}

const byCode = (a: any, b: any) => String(a.code).localeCompare(String(b.code), 'pt-BR', { numeric: true });

export function usePricingData(storeId: string): PricingStore {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [lists, setLists] = useState<Record<PricingCollection, any[]>>({
    ingredients: [],
    packaging: [],
    recipes: [],
    products: [],
    combos: [],
    invoices: [],
    itemMaps: [],
  });
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(new Set());
    setError(null);
    const markLoaded = (key: string) => setLoaded((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    const onError = (err: Error) => {
      console.error('[Precificação] Falha ao ler do Firestore:', err);
      setError(err.message);
    };

    const unsubs = KEYS.map((key) =>
      onSnapshot(
        collection(db, 'stores', storeId, PRICING_COLLECTIONS[key]),
        (snap) => {
          const rows = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          const sorted =
            key === 'invoices'
              ? rows.sort((a: any, b: any) => String(b.issuedAt).localeCompare(String(a.issuedAt)))
              : key === 'itemMaps'
                ? rows
                : rows.sort(byCode);
          setLists((prev) => ({ ...prev, [key]: sorted }));
          markLoaded(key);
        },
        onError,
      ),
    );
    unsubs.push(
      onSnapshot(
        doc(db, 'stores', storeId, 'pricing_config', 'main'),
        (snap) => {
          setConfig(snap.exists() ? ({ ...defaultConfig(), ...snap.data() } as PricingConfig) : null);
          markLoaded('config');
        },
        onError,
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [storeId]);

  const data = useMemo<PricingData>(
    () => ({
      config: config || defaultConfig(),
      ingredients: lists.ingredients,
      packaging: lists.packaging,
      recipes: lists.recipes,
      products: lists.products,
      combos: lists.combos,
    }),
    [config, lists],
  );

  const loading = loaded.size < KEYS.length + 1 && !error;
  const isEmpty = !loading && !config && CORE_KEYS.every((k) => lists[k].length === 0);

  const save: PricingStore['save'] = async (kind, item) => {
    const stamped = { ...item, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'stores', storeId, PRICING_COLLECTIONS[kind], item.id), sanitizeForFirestore(stamped));
  };

  const saveMany: PricingStore['saveMany'] = async (writes) => {
    const now = new Date().toISOString();
    for (let i = 0; i < writes.length; i += 400) {
      const batch = writeBatch(db);
      for (const w of writes.slice(i, i + 400)) {
        batch.set(doc(db, 'stores', storeId, PRICING_COLLECTIONS[w.kind], w.item.id), sanitizeForFirestore({ ...w.item, updatedAt: now }));
      }
      await batch.commit();
    }
  };

  const remove: PricingStore['remove'] = async (kind, id) => {
    await deleteDoc(doc(db, 'stores', storeId, PRICING_COLLECTIONS[kind], id));
  };

  const saveConfig: PricingStore['saveConfig'] = async (patch) => {
    const next = { ...(config || defaultConfig()), ...patch, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'stores', storeId, 'pricing_config', 'main'), sanitizeForFirestore(next));
  };

  // Grava tudo em lotes (limite do Firestore: 500 operações por lote)
  const importAll: PricingStore['importAll'] = async (incoming) => {
    const ops: Array<[string, string, any]> = [['pricing_config', 'main', incoming.config]];
    for (const key of CORE_KEYS) {
      for (const item of (incoming as any)[key] || []) ops.push([PRICING_COLLECTIONS[key], item.id, item]);
    }
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      for (const [col, id, value] of ops.slice(i, i + 400)) {
        batch.set(doc(db, 'stores', storeId, col, id), sanitizeForFirestore(value));
      }
      await batch.commit();
    }
  };

  return {
    storeId,
    data,
    invoices: lists.invoices,
    itemMaps: lists.itemMaps,
    loading,
    error,
    isEmpty,
    save,
    saveMany,
    remove,
    saveConfig,
    importAll,
  };
}

/** Reduz uma foto para caber no documento do Firestore (lado maior em px, JPEG). */
export function compressImage(file: File, maxSide = 640, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponível'));
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
