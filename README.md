# Ticketera - Sistema de Gestión de Tickets

Sistema de gestión de tickets desarrollado con Next.js 15, React 19, TypeScript, Supabase y Tailwind CSS.

## 🚀 Stack Tecnológico

- **Next.js 15.5.4** - Framework React con App Router
- **React 19.1.0** - Biblioteca de UI
- **TypeScript 5** - Tipado estático
- **Supabase** - Backend como servicio (Base de datos, Auth, Realtime)
- **Tailwind CSS 4** - Framework de estilos
- **Framer Motion** - Animaciones
- **Lucide React** - Iconos
- **Radix UI Icons** - Iconos adicionales
- **date-fns** - Utilidades para fechas

## 📦 Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Configura las variables de entorno:
   - Copia `.env.example` a `.env.local`
   - Agrega tus credenciales de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🏗️ Estructura del Proyecto

```
synapseweb/
├── app/                 # Páginas y rutas (Next.js App Router)
│   ├── (auth)/         # Grupo de autenticación
│   ├── dashboard/      # Dashboard de productoras
│   ├── admin/          # Panel de administración
│   └── ...
│
├── components/          # Componentes React
│   ├── auth/           # Componentes de autenticación
│   └── ...
│
├── lib/                 # Utilidades y helpers
│   ├── hooks/          # Custom hooks
│   ├── supabase/       # Clientes Supabase
│   └── utils/          # Utilidades generales
│
├── supabase/
│   └── migrations/     # Scripts SQL de migración
│
├── docs/               # Documentación del proyecto
│
├── public/             # Archivos estáticos
│
└── middleware.ts       # Middleware de Next.js
```

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## 🔧 Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Obtén tu URL y Anon Key desde Settings > API
3. Agrega las variables de entorno en tu archivo `.env.local`

## 📚 Próximos Pasos

- Configurar autenticación con Supabase Auth
- Crear esquema de base de datos para tickets
- Implementar CRUD de tickets
- Agregar filtros y búsqueda
- Implementar notificaciones en tiempo real
- Integrar el sistema de diseño del archivo `design.json`
