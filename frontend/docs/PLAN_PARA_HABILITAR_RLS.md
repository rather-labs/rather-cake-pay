# 📋 Plan Para Habilitar RLS en Producción

## Dificultad: **Media** ⭐⭐⭐ (3-4 horas)

## ¿Por Qué No Es Difícil Ahora?

Tu código **YA está preparado** para RLS porque:
- ✅ Usas queries simples sin JOINs recursivos
- ✅ Las API separadas (no hay dependencias circulares)
- ✅ El código no asume acceso sin restricciones

## Cuándo Deberías Hacerlo

### 🟢 Hazlo ANTES de producción si:
- Tendrás usuarios reales
- Manejarás datos sensibles (montos, transacciones)
- Necesitas multi-tenancy (usuarios separados)

### 🟡 Puedes esperar si:
- Estás en fase de prototipo
- Solo tú y tu equipo usan la app
- Aún no hay datos reales

### 🔴 DEBES hacerlo si:
- Vas a lanzar públicamente
- Manejas dinero real (cripto)
- Tienes requisitos de compliance

## Pasos Para Habilitar RLS (Detallado)

### FASE 1: Implementar Autenticación (2 horas)

#### 1.1 Configurar Auth en Supabase
```typescript
// lib/auth/wallet-auth.ts
import { createClient } from '@/lib/supabase/client'

export async function signInWithWallet(walletAddress: string, signature: string) {
  const supabase = createClient()

  // Verificar firma
  const message = `Sign in to CakePay: ${Date.now()}`
  // ... validación de firma con ethers

  // Buscar o crear usuario
  const { data: user } = await supabase
    .from('users')
    .select()
    .eq('wallet_address', walletAddress)
    .single()

  // Crear sesión custom
  return user
}
```

#### 1.2 Crear Context de Usuario
```typescript
// contexts/UserContext.tsx
'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const UserContext = createContext<{
  user: User | null
  signIn: (address: string) => Promise<void>
  signOut: () => void
}>({
  user: null,
  signIn: async () => {},
  signOut: () => {}
})

export function UserProvider({ children }) {
  const [user, setUser] = useState<User | null>(null)

  // Cargar usuario desde localStorage o wallet
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) setUser(JSON.parse(savedUser))
  }, [])

  return (
    <UserContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
```

#### 1.3 Actualizar Componentes
```typescript
// Antes (con TEST_USER_ID)
import { TEST_USER_ID } from '@/lib/constants'
const { cakes } = useCakes(TEST_USER_ID)

// Después (con usuario real)
import { useUser } from '@/contexts/UserContext'
const { user } = useUser()
const { cakes } = useCakes(user?.id || '')
```

**Archivos a modificar:**
- `app/dashboard/page.tsx`
- `app/dashboard/[groupId]/page.tsx`
- `app/layout.tsx` (wrap con UserProvider)

**Tiempo:** 2 horas

---

### FASE 2: Configurar Políticas RLS (1 hora)

#### 2.1 Políticas Basadas en Usuario Autenticado

Ya tienes un script base: `scripts/fix-rls-policies.sql`

Necesitas modificarlo para usar el usuario actual:

```sql
-- USERS: Solo ver tu propio perfil y perfiles de miembros de tus grupos
CREATE POLICY "Users can view themselves"
  ON users FOR SELECT
  USING (id = current_setting('app.current_user_id', true)::uuid);

-- CAKES: Solo ver grupos donde eres miembro
CREATE POLICY "Users can view their cakes"
  ON cakes FOR SELECT
  USING (
    id IN (
      SELECT cake_id
      FROM cake_members
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- CAKE_MEMBERS: Solo ver miembros de tus grupos
CREATE POLICY "Users can view members of their cakes"
  ON cake_members FOR SELECT
  USING (
    cake_id IN (
      SELECT cake_id
      FROM cake_members
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Similar para: cake_ingredients, ingredient_splits, balances, settlements
```

#### 2.2 Pasar el User ID a Supabase

```typescript
// lib/supabase/client.ts
export function createClient(userId?: string) {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Establecer el user ID en la sesión
  if (userId) {
    client.rpc('set_config', {
      setting: 'app.current_user_id',
      value: userId
    })
  }

  return client
}
```

**Tiempo:** 1 hora

---

### FASE 3: Testing y Ajustes (1 hora)

#### 3.1 Test Checklist

- [ ] Usuario puede ver solo sus grupos
- [ ] Usuario NO puede ver grupos de otros
- [ ] Usuario puede crear nuevo grupo
- [ ] Usuario puede agregar gastos a su grupo
- [ ] Usuario NO puede modificar grupos ajenos
- [ ] Settlements funcionan correctamente
- [ ] Balances se calculan bien

#### 3.2 Casos Edge a Probar

```typescript
// Test 1: Usuario nuevo sin grupos
// Esperado: Ver empty state, poder crear grupo

// Test 2: Usuario con 1 grupo
// Esperado: Ver ese grupo, no ver otros

// Test 3: Usuario miembro (no admin)
// Esperado: Ver grupo, no poder eliminar

// Test 4: Intentar acceder a grupo ajeno por URL
// Esperado: Error 403 o redirect
```

**Tiempo:** 1 hora

---

## Alternativa: RLS Simplificado (1 hora)

Si quieres algo más rápido pero funcional:

### Políticas Ultra-Simples

```sql
-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cake_members ENABLE ROW LEVEL SECURITY;

-- Políticas: "confía en el cliente"
CREATE POLICY "Allow authenticated users" ON users
  USING (true);

CREATE POLICY "Allow authenticated users" ON cakes
  USING (true);

CREATE POLICY "Allow authenticated users" ON cake_members
  USING (true);
```

Luego en el cliente, validas:

```typescript
function useCakes(userId: string) {
  // Verificar que userId = usuario autenticado
  const { user } = useUser()

  if (userId !== user?.id) {
    throw new Error('Unauthorized')
  }

  // Continuar con la query...
}
```

**Pros:**
- ✅ Más rápido de implementar (1 hora)
- ✅ Funciona para MVP
- ✅ Fácil de entender

**Contras:**
- ⚠️ Seguridad depende del cliente
- ⚠️ Cualquiera puede hacer queries directas a Supabase
- ⚠️ No es ideal para producción seria

---

## Resumen de Esfuerzo

| Fase | Tiempo | Dificultad | Necesario Para |
|------|--------|------------|----------------|
| **Auth Básica** | 2h | Media | MVP público |
| **RLS Políticas** | 1h | Media-Alta | Producción seria |
| **Testing** | 1h | Baja | Cualquier release |
| **Total Completo** | **4h** | **Media** | **Producción** |
| **RLS Simplificado** | **1h** | **Baja** | **MVP rápido** |

---

## Mi Recomendación

### Para un Hackathon/MVP (1-2 semanas):
1. ✅ Deshabilita RLS ahora (ya lo hicimos)
2. ✅ Implementa auth de wallet básica (2h)
3. ✅ Usa el enfoque "confía en el cliente"
4. 🚀 Lanza rápido

### Para Producción Real (después del MVP):
1. ✅ Implementa auth completa (2h)
2. ✅ Configura RLS correctamente (1h)
3. ✅ Testing exhaustivo (1h)
4. ✅ Auditoría de seguridad

---

## Código de Ejemplo: Auth Rápida

Puedo darte un ejemplo completo de wallet auth básica que funcione con tu setup actual:

```typescript
// hooks/use-wallet-auth.ts
export function useWalletAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [address, setAddress] = useState<string | null>(null)

  async function connectWallet() {
    if (!window.ethereum) {
      alert('Install MetaMask!')
      return
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    })

    const walletAddress = accounts[0]
    setAddress(walletAddress)

    // Buscar/crear usuario en Supabase
    const supabase = createClient()
    let { data: user } = await supabase
      .from('users')
      .select()
      .eq('wallet_address', walletAddress)
      .single()

    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ wallet_address: walletAddress })
        .select()
        .single()
      user = newUser
    }

    setUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }

  return { user, address, connectWallet }
}
```

¿Quieres que te prepare el código completo para implementar auth rápida ahora? O prefieres seguir con RLS deshabilitado por ahora?
