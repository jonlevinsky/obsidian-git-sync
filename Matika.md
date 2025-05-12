# Vektory a analytická geometrie – opakování

---

## 1) Výpočet složeného výrazu s vektory

### Zadání:
Dáno:
- **a = (-1, 5)**
- **b = (2, 5)**
- **w = (4, -6)**

Vypočítej:
**d = 3a - 2b - 5w**

### Postup:
1. Vynásob jednotlivé vektory skalárem.
2. Sečti/vyjmi výsledky po složkách (x, y zvlášť).

### Výpočet:
- 3a = (-3, 15)
- 2b = (4, 10)
- 5w = (20, -30)

**d = (-3 - 4 - 20, 15 - 10 + 30) = (-27, 35)**

---

## 2) Určení souřadnic vektoru a jeho velikosti

### Zadání:
A = (0,1), B = (6,3)

### Postup:
- **Vektor AB = B - A = (x₂ - x₁, y₂ - y₁)**
- **Velikost vektoru |v| = √(x² + y²)**

### Výpočet:
- **AB = (6, 2)**
- **|AB| = √(6² + 2²) = √(36 + 4) = √40 = 2√10**

---

## 3) Kolmost vektorů

### Zadání:
**u = (3, -2), v = (-1, b)**

### Postup:
- Vektory jsou kolmé, když jejich **skalární součin = 0**
- **u · v = x₁x₂ + y₁y₂ = 0**

### Výpočet:
- 3·(-1) + (-2)·b = 0
- -3 - 2b = 0 → **b = -3/2**

---

## 4) Rovnice přímky dané dvěma body

### Zadání:
E = (-7,3), F = (-3,6)

### Postup:
- Směrový vektor: **d = F - E = (4,3)**
- **Parametrická rovnice:**  
  x = x₀ + at  
  y = y₀ + bt

- **Obecná rovnice:**
  Najdi směrnici a pak sestav rovnici typu **y - y₀ = k(x - x₀)**  
  → uprav do tvaru Ax + By + C = 0

- **Směrnicový tvar:**  
  y = kx + q

### Výpočet:
- **Parametricky:** x = -7 + 4t, y = 3 + 3t
- **Směrnice:** k = (6 - 3)/(−3 + 7) = 3/4
- **Obecně:** y - 3 = 3/4(x + 7)  
  → 3x - 4y + 33 = 0
- **Směrnicově:** y = 3/4 x + 51/4

---

## 5) Určení vzájemné polohy přímek

### Zadání:
p: 2x - y - 3 = 0  
q: x = -5 + 3t  
   y = -3 + t

### Postup:
1. Najdi **směrový vektor** z parametrického tvaru.
2. Z obecné rovnice najdi směrnici přímky.
3. Pokud směrové vektory nejsou lineárně závislé → přímky se **protínají**.
4. Dosadíme parametry z q do rovnice p → zjistíme průsečík.

### Výpočet:
- Směr. vektor q: (3,1)
- Směrnice p: y = 2x - 3 → směr. vektor (1,2)
- (3,1) není násobkem (1,2) → přímky se **protínají**

Dosadíme do p:
- x = -5 + 3t  
- y = -3 + t  
→ 2(-5 + 3t) - (-3 + t) - 3 = 0  
→ -10 + 6t + 3 - t - 3 = 0  
→ 5t - 10 = 0 → t = 2

**Průsečík: (1, -1)**

---

## 6) Přímka rovnoběžná s danou přímkou procházející bodem

### Zadání:
Bod K = (11, -4),  
přímka p:  
x = 1 - 4t  
y = 1 - 3t

### Postup:
- Směr. vektor přímky p: **(-4, -3)**
- Použij ho k vytvoření **parametrické rovnice** nové přímky přes bod K.
- Chceš-li obecnou rovnici, najdi směrnici a použij **y = kx + q**, pak převeď na obecnou.

### Výpočet:
**Parametricky:**  
x = 11 - 4t  
y = -4 - 3t

**Směrnice:** k = 3/4  
Dosadíme bod (11, -4):  
-4 = 3/4 · 11 + q → q = -59/4

**Směrnicový tvar:** y = 3/4 x - 59/4  
**Obecně:** 3x - 4y - 59 = 0

---