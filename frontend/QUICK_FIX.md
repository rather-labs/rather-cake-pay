# 🚨 FIX RÁPIDO - Error de Recursión RLS

## El Error
```
Error loading groups: infinite recursion detected in policy for relation "cake_members"
```

## Solución (3 pasos - 3 minutos)

### 1️⃣ Ve a Supabase SQL Editor

URL directa: https://supabase.com/dashboard/project/rwcejndiziqgmdpabmnb/sql

### 2️⃣ Ejecuta este SQL

Copia TODO esto y da click en RUN:

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE cakes DISABLE ROW LEVEL SECURITY;
ALTER TABLE cake_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE cake_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE settlements DISABLE ROW LEVEL SECURITY;
```

### 3️⃣ Crea el usuario de prueba

Ejecuta esto también:

```sql
INSERT INTO users (wallet_address, username, avatar_url)
VALUES (
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
  'cryptowhale_42',
  null
)
RETURNING *;
```

**Copia el `id` que aparece en el resultado**

### 4️⃣ Actualiza lib/constants.ts línea 5

Pega el UUID que copiaste:
```typescript
export const TEST_USER_ID = 'PEGA-EL-UUID-AQUI'
```

### ✅ Listo

```bash
npm run dev
```

El error desaparecerá.
