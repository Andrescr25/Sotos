import { PRODUCT_KIND } from '@/domain/menu';

/**
 * Menú de ejemplo para desarrollo. Cuando exista el módulo de administración
 * este contenido vendrá del backend; la forma de los datos no cambia.
 * Precios en colones enteros.
 * @type {import('@/domain/menu/types').Menu}
 */
export const menuSeed = {
  categories: [
    { id: 'cat-hamburguesas', name: 'Hamburguesas', icon: 'fast-food', sortOrder: 1, active: true },
    { id: 'cat-acompanamientos', name: 'Acompañamientos', icon: 'restaurant', sortOrder: 2, active: true },
    { id: 'cat-bebidas', name: 'Bebidas', icon: 'cafe', sortOrder: 3, active: true },
  ],
  products: [
    {
      id: 'prod-hamburguesa-clasica',
      categoryId: 'cat-hamburguesas',
      name: 'Hamburguesa clásica',
      kind: PRODUCT_KIND.DISH,
      price: 3500,
      extraIds: ['extra-queso', 'extra-tocino', 'extra-huevo'],
      sortOrder: 1,
      active: true,
    },
    {
      id: 'prod-hamburguesa-doble',
      categoryId: 'cat-hamburguesas',
      name: 'Hamburguesa doble',
      kind: PRODUCT_KIND.DISH,
      price: 4800,
      extraIds: ['extra-queso', 'extra-tocino', 'extra-huevo'],
      sortOrder: 2,
      active: true,
    },
    {
      id: 'prod-pollo-crispy',
      categoryId: 'cat-hamburguesas',
      name: 'Sándwich de pollo crispy',
      kind: PRODUCT_KIND.DISH,
      price: 3900,
      extraIds: ['extra-queso', 'extra-tocino'],
      sortOrder: 3,
      active: true,
    },
    {
      id: 'prod-papas',
      categoryId: 'cat-acompanamientos',
      name: 'Papas',
      kind: PRODUCT_KIND.DISH,
      price: 1500,
      extraIds: ['extra-salsa'],
      sortOrder: 1,
      active: true,
    },
    {
      id: 'prod-papas-grandes',
      categoryId: 'cat-acompanamientos',
      name: 'Papas grandes',
      kind: PRODUCT_KIND.DISH,
      price: 2200,
      extraIds: ['extra-salsa'],
      sortOrder: 2,
      active: true,
    },
    {
      id: 'prod-coca-cola',
      categoryId: 'cat-bebidas',
      name: 'Coca-Cola',
      kind: PRODUCT_KIND.DRINK,
      price: 1000,
      extraIds: [],
      sortOrder: 1,
      active: true,
    },
    {
      id: 'prod-fresco',
      categoryId: 'cat-bebidas',
      name: 'Fresco natural',
      kind: PRODUCT_KIND.DRINK,
      price: 1200,
      extraIds: [],
      sortOrder: 2,
      active: true,
    },
  ],
  extras: [
    { id: 'extra-queso', name: 'Queso extra', price: 500, active: true },
    { id: 'extra-tocino', name: 'Tocino', price: 700, active: true },
    { id: 'extra-huevo', name: 'Huevo', price: 400, active: true },
    { id: 'extra-salsa', name: 'Salsa extra', price: 300, active: true },
  ],
  quickNotes: [
    'Sin cebolla',
    'Sin tomate',
    'Sin salsa',
    'Bien cocido',
    'Término medio',
    'Para llevar',
  ],
};
