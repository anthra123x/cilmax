// Configuración del panel de administración Keystatic.
// El panel se monta en /keystatic (rutas inyectadas por @keystatic/astro) y
// guarda los cambios en git (repo anthra123x/cilmax) mediante una GitHub App.
import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
  storage: {
    kind: 'github',
    repo: 'anthra123x/cilmax',
    branchPrefix: 'kcms-',
  },
  ui: {
    brand: {
      name: 'CilMax',
    },
    navigation: {
      Contenido: ['products', 'categories'],
      Ajustes: ['site'],
    },
  },
  collections: {
    products: collection({
      label: 'Productos',
      path: 'src/data/products/**',
      slugField: 'title',
      format: 'json',
      columns: ['title', 'featured', 'order'],
      schema: {
        id: fields.text({
          label: 'ID interno',
          description: 'Identificador único usado por el carrito (p. ej. prod_auriculares).',
          validation: { isRequired: true },
        }),
        title: fields.slug({
          name: { label: 'Nombre del producto', validation: { isRequired: true } },
          slug: { label: 'Slug (se usa en la URL)' },
        }),
        description: fields.text({
          label: 'Descripción',
          multiline: true,
          validation: { isRequired: true },
        }),
        images: fields.array(
          fields.image({
            label: 'Imagen',
            directory: 'public/assets/products',
            publicPath: '/assets/products',
          }),
          { label: 'Imágenes', itemLabel: (props) => props.value?.filename ?? 'Imagen' },
        ),
        category: fields.relationship({
          label: 'Categoría',
          collection: 'categories',
        }),
        tags: fields.array(fields.text({ label: 'Etiqueta' }), {
          label: 'Etiquetas',
          itemLabel: (props) => props.value || 'Etiqueta',
        }),
        featured: fields.checkbox({ label: 'Destacado en la portada', defaultValue: false }),
        order: fields.number({ label: 'Orden en el catálogo', defaultValue: 100 }),
        variants: fields.array(
          fields.object({
            id: fields.text({ label: 'ID', validation: { isRequired: true } }),
            title: fields.text({ label: 'Nombre de la variante', validation: { isRequired: true } }),
            sku: fields.text({ label: 'SKU' }),
            prices: fields.array(
              fields.object({
                amount: fields.number({ label: 'Precio (COP)', validation: { isRequired: true } }),
                currency_code: fields.select({
                  label: 'Moneda',
                  options: [{ label: 'COP', value: 'cop' }],
                  defaultValue: 'cop',
                }),
              }),
              { label: 'Precios', itemLabel: () => 'Precio' },
            ),
            inventory_quantity: fields.number({ label: 'Stock', defaultValue: 0 }),
          }),
          {
            label: 'Variantes',
            itemLabel: (props) => props?.fields?.title?.value ?? '',
          },
        ),
      },
    }),
    categories: collection({
      label: 'Categorías',
      path: 'src/data/categories/**',
      slugField: 'name',
      format: 'json',
      columns: ['name'],
      schema: {
        name: fields.slug({
          name: { label: 'Nombre de la categoría', validation: { isRequired: true } },
          slug: { label: 'Slug' },
        }),
        description: fields.text({
          label: 'Descripción',
        }),
      },
    }),
  },
  singletons: {
    site: singleton({
      label: 'Colores de la marca',
      path: 'src/data/site',
      format: 'json',
      schema: {
        primaryColor: fields.text({
          label: 'Color primario',
          description: 'Color turquesa principal (p. ej. #008a93).',
          defaultValue: '#008a93',
        }),
        goldColor: fields.text({
          label: 'Color dorado',
          description: 'Color de acento dorado (p. ej. #d4af37).',
          defaultValue: '#d4af37',
        }),
      },
    }),
  },
});