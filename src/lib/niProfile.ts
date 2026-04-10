/**
 * NIProfile v2 — Multi-material identity system
 *
 * Replaces the fixed car/home/body/style string fields with a dynamic
 * materials[] array. Each material item has its own name, value, category,
 * image, and priority.
 *
 * Migration: v1 profiles (with car/home/body/style strings) are auto-converted
 * on read and persisted back as v2. The "body" field is dropped (not a material item).
 */

import { db } from './store';

// ── Types ──

export type MaterialCategory = 'car' | 'home' | 'style' | 'custom';

export interface MaterialItem {
  id: string;
  label: string;
  category: MaterialCategory;
  value: number;
  image?: string;
  priority: number;
}

export interface NIProfileV2 {
  metaM: number;
  meta180: number;
  materials: MaterialItem[];
  impact: string;
  anchor: string;
  startDate: string;
  _version: 2;
}

// Legacy v1 (for migration only)
export interface NIProfileV1 {
  metaM: number;
  meta180: number;
  car: string;
  home: string;
  body: string;
  style: string;
  impact: string;
  anchor: string;
  startDate: string;
  images?: Record<string, string>;
  dreamItemLabel?: string;
  dreamItemValue?: number;
}

export type NIProfileAny = NIProfileV1 | NIProfileV2;

// Canonical export
export type NIProfile = NIProfileV2;

// ── Migration ──

export function migrateProfile(raw: NIProfileAny): NIProfileV2 {
  if ('_version' in raw && raw._version === 2) {
    return raw as NIProfileV2;
  }

  const v1 = raw as NIProfileV1;
  const materials: MaterialItem[] = [];
  let nextPriority = 2;

  const mapping: Array<{ key: 'car' | 'home' | 'style'; category: MaterialCategory }> = [
    { key: 'car', category: 'car' },
    { key: 'home', category: 'home' },
    // body intentionally skipped — not a material item
    { key: 'style', category: 'style' },
  ];

  for (const { key, category } of mapping) {
    const text = v1[key];
    if (text) {
      const isPrimary = v1.dreamItemLabel === key;
      materials.push({
        id: `migrated_${key}`,
        label: text,
        category,
        value: isPrimary && v1.dreamItemValue ? v1.dreamItemValue : 0,
        image: v1.images?.[key],
        priority: isPrimary ? 1 : nextPriority++,
      });
    }
  }

  // Ensure exactly one item has priority 1
  if (materials.length > 0 && !materials.some(m => m.priority === 1)) {
    materials[0].priority = 1;
    // Renumber the rest
    let p = 2;
    materials.filter(m => m.priority !== 1).forEach(m => { m.priority = p++; });
  }

  return {
    metaM: v1.metaM,
    meta180: v1.meta180,
    materials,
    impact: v1.impact || '',
    anchor: v1.anchor || '',
    startDate: v1.startDate || '',
    _version: 2,
  };
}

// ── Reader (auto-migrates) ──

export function getNIProfile(userId: string): NIProfileV2 | null {
  const raw = db.get<NIProfileAny>(`ni_profile_${userId}`);
  if (!raw) return null;

  const migrated = migrateProfile(raw);

  // Persist v2 format back if it was v1
  if (!('_version' in raw) || raw._version !== 2) {
    db.set(`ni_profile_${userId}`, migrated);
  }

  return migrated;
}

// ── Helpers ──

export const CATEGORY_META: Record<MaterialCategory, { emoji: string; label: string }> = {
  car: { emoji: '🚗', label: 'Carro' },
  home: { emoji: '🏠', label: 'Moradia' },
  style: { emoji: '✨', label: 'Estilo de vida' },
  custom: { emoji: '🎯', label: 'Personalizado' },
};

export function genMaterialId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
