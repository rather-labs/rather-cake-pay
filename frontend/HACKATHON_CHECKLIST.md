# 🏆 Checklist Para Hackathon - Rather Cake Pay

## Estado Actual del Proyecto

### ✅ Lo Que YA Tienes (Funcionando)
- ✅ UI completa con shadcn/ui + pixel art design
- ✅ Supabase configurado (.env.local)
- ✅ Base de datos con tablas correctas
- ✅ API layer completa (cakes, ingredients, settlements, balances, users)
- ✅ Landing page atractiva
- ✅ Dashboard layout
- ✅ Páginas de grupo y settlement
- ✅ Build funcionando

### ❌ Lo Que NO Funciona (Bloqueadores)
1. **RLS Error** - Bloquea todo ⛔ **[CRÍTICO - 5 min]**
2. **Mock data** - Dashboard/páginas no usan Supabase real
3. **No hay funcionalidad real** - Botones no hacen nada

---

## 🎯 Plan de 6 Horas Para Hackathon

### FASE 1: Desbloquear App (15 minutos) 🔥

#### ✅ 1.1 Deshabilitar RLS [5 min]
```sql
-- Ejecutar en Supabase SQL Editor
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE cakes DISABLE ROW LEVEL SECURITY;
ALTER TABLE cake_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE cake_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE settlements DISABLE ROW LEVEL SECURITY;
```

#### ✅ 1.2 Crear Usuario de Prueba [5 min]
```sql
INSERT INTO users (wallet_address, username)
VALUES ('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2', 'cryptowhale_42')
RETURNING *;
```
Copiar el UUID y actualizar `lib/constants.ts`

#### ✅ 1.3 Verificar [5 min]
```bash
npm run dev
# Dashboard debe cargar sin error
```

---

### FASE 2: Funcionalidad Básica (3 horas) 🚀

#### 🎯 2.1 Crear Grupo (45 min)
**Archivo:** `app/dashboard/page.tsx`

**Qué hacer:**
```typescript
const handleCreateGroup = async () => {
  if (!groupName.trim()) return

  const supabase = createClient()
  const cakesAPI = new CakesAPI(supabase)

  const { data, error } = await cakesAPI.createCake(
    {
      name: groupName,
      description: `Created on ${new Date().toLocaleDateString()}`
    },
    TEST_USER_ID
  )

  if (error) {
    alert('Error: ' + error.message)
    return
  }

  // Refresh la lista
  window.location.reload()
}
```

**Prioridad:** 🔥🔥🔥 ALTA
**Tiempo:** 45 min
**Resultado:** Usuario puede crear grupos

---

#### 🎯 2.2 Ver Detalles del Grupo (1 hora)
**Archivo:** `app/dashboard/[groupId]/page.tsx`

**Qué hacer:**
1. Crear hook `use-cake-detail.ts`
2. Fetch cake con miembros e ingredientes
3. Mostrar data real (no mock)
4. Calcular balances

**Código básico:**
```typescript
// hooks/use-cake-detail.ts
export function useCakeDetail(cakeId: string) {
  const [cake, setCake] = useState<CakeWithMembers | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCake() {
      const supabase = createClient()
      const cakesAPI = new CakesAPI(supabase)
      const { data } = await cakesAPI.getCake(cakeId)
      setCake(data)
      setLoading(false)
    }
    fetchCake()
  }, [cakeId])

  return { cake, loading }
}
```

**Prioridad:** 🔥🔥 MEDIA-ALTA
**Tiempo:** 1 hora
**Resultado:** Ver grupos existentes con info real

---

#### 🎯 2.3 Agregar Gasto (1 hora)
**Archivo:** `app/dashboard/[groupId]/page.tsx`

**Qué hacer:**
```typescript
const handleAddExpense = async () => {
  const supabase = createClient()
  const ingredientsAPI = new IngredientsAPI(supabase)

  // Crear el gasto
  const { data, error } = await ingredientsAPI.createIngredient(
    {
      cake_id: groupId,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      paid_by: newExpense.paidBy
    },
    // Splits entre los seleccionados
    newExpense.splitBetween.map(userId => ({
      user_id: userId,
      amount: parseFloat(newExpense.amount) / newExpense.splitBetween.length
    }))
  )

  if (!error) {
    // Refresh
    window.location.reload()
  }
}
```

**Prioridad:** 🔥🔥🔥 ALTA
**Tiempo:** 1 hora
**Resultado:** Crear gastos y splits funcionales

---

#### 🎯 2.4 Invitar Miembros (15 min)
**Simple:** Solo agregar wallet address

```typescript
async function inviteMember(cakeId: string, walletAddress: string) {
  const supabase = createClient()

  // Buscar/crear usuario
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

  // Agregar a cake_members
  const cakesAPI = new CakesAPI(supabase)
  await cakesAPI.addMember(cakeId, user.id)
}
```

**Prioridad:** 🔥 MEDIA
**Tiempo:** 15 min
**Resultado:** Agregar amigos al grupo

---

### FASE 3: Polish Mínimo (1 hora) ✨

#### 🎯 3.1 Loading States (20 min)
- Spinners en botones mientras se guarda
- Skeleton loaders en listas

#### 🎯 3.2 Error Handling (20 min)
- Toast notifications para errores
- Try-catch en todas las operaciones

#### 🎯 3.3 UX Basics (20 min)
- Deshabilitar botones durante loading
- Cerrar modales después de crear
- Mensajes de éxito

---

### FASE 4: Demo Prep (1 hora) 🎬

#### 🎯 4.1 Crear Data de Demo (20 min)
```sql
-- Crear algunos grupos y gastos de ejemplo
-- Para que la demo se vea bien
```

#### 🎯 4.2 Practicar Demo (20 min)
- Flujo: Landing → Connect → Dashboard → Crear grupo → Agregar gasto → Ver balances

#### 🎯 4.3 Deploy (20 min)
- Vercel deploy
- Verificar que funcione en prod

---

## 🎯 Features FUERA de Scope (No hacer en hackathon)

- ❌ Wallet real authentication (usa TEST_USER_ID)
- ❌ Settlements on-chain
- ❌ RLS habilitado
- ❌ Notificaciones
- ❌ Editar/borrar gastos
- ❌ Leaderboard real
- ❌ Imágenes de grupos
- ❌ Chat/comentarios
- ❌ Analytics

---

## 📊 Timeline Realista

```
Hora 0-1:   Desbloquear + Crear Grupo
Hora 1-2:   Ver Detalles de Grupo
Hora 2-3:   Agregar Gastos (parte 1)
Hora 3-4:   Agregar Gastos (parte 2) + Invitar
Hora 4-5:   Polish y Error Handling
Hora 5-6:   Demo Prep y Deploy
```

---

## 🏆 MVP Mínimo Para Demo (3 horas críticas)

Si solo tienes 3 horas, haz SOLO esto:

1. ✅ Fix RLS (15 min)
2. ✅ Crear grupo funcional (45 min)
3. ✅ Agregar gasto funcional (1 hora)
4. ✅ Ver lista de gastos (30 min)
5. ✅ Deploy (30 min)

**Con esto puedes demostrar:** "Creé un grupo, agregué un gasto, se ve en la lista"

---

## 🎁 Bonus Si Sobra Tiempo

- Calcular balances automáticamente
- Mostrar "quién debe a quién"
- Settlement flow básico
- Animations/transitions

---

## 🚀 Siguiente Paso INMEDIATO

**AHORA MISMO:** Deshabilita RLS (5 minutos)

1. Abre: https://supabase.com/dashboard/project/rwcejndiziqgmdpabmnb/sql
2. Pega el SQL de FASE 1.1
3. Ejecuta
4. Crea el usuario (FASE 1.2)
5. Actualiza `lib/constants.ts`

¿Listo para empezar? Una vez que hagas esto, te ayudo con el código para crear grupos.
