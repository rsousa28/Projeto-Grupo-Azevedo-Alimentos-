# Login com Firebase Authentication e banco protegido

## O que mudou

- O login usa o **Firebase Authentication** (email/senha). Cada pessoa continua entrando com o
  **usuário** de sempre; por baixo, o usuário vira o email `usuario@grupoazevedo.app` (só um
  identificador, não recebe email).
- **Nenhuma senha fica no código ou no banco.** O perfil em `users/{id}` guarda só nome, usuário e cargo.
- As **regras do Firestore** (`firestore.rules`) exigem login e respeitam o cargo:
  - `ADMIN`: tudo (todas as lojas, usuários, backups, auditoria).
  - `FINANCIAL` e outros: lojas 1, 2 e 3.
  - Gerentes: só a própria loja (B32 = 1, B28 = 2, Vero Pasta = 3).
  - Contas sem perfil em `users` não acessam nada.
- **Equipe** (admin): cria a conta de login junto com o perfil. A senha não é editada ali.
- **Configurações > Alterar minha senha**: cada pessoa troca a própria senha.
- **Biometria**: libera a sessão que o aparelho já tem. Depois de "Sair", é preciso entrar com senha
  uma vez para a biometria voltar a funcionar.

## Publicar (nesta ordem)

1. **Ativar o login por email/senha** no [Console do Firebase](https://console.firebase.google.com/):
   projeto `gen-lang-client-0790951913` > **Authentication** > **Sign-in method** > **Email/Password** > Ativar.
2. **Criar os logins com senhas novas** (as antigas vazaram no repositório público):
   ```bash
   npx tsx scripts/set-user-passwords.ts --key ~/Downloads/<arquivo-da-conta-de-servico>.json
   ```
   O script pergunta a nova senha de cada pessoa (não aparece na tela). Enter vazio pula a pessoa.
3. **Publicar o código** (push na `main`; a Vercel publica sozinha).
4. **Publicar as regras**:
   ```bash
   npx firebase login
   npx firebase deploy --only firestore:rules
   ```
5. Entrar no site com o novo login e conferir.

Para trocar a senha de alguém depois: `npx tsx scripts/set-user-passwords.ts --key <arquivo>.json --only <usuario>`.

## Testar localmente (sem tocar em produção)

```bash
npm run test:rules          # testes automáticos das regras
npm run emulators           # em outro terminal: Auth + Firestore locais
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx scripts/seed-emulators.ts
VITE_USE_FIREBASE_EMULATORS=true npx vite
```

Logins de teste do emulador estão em `scripts/seed-emulators.ts`.

## Limitações conhecidas

- O `server.ts` (AI Studio) acessa o banco sem login. Depois das novas regras, o botão de teste de push,
  a fila de emails e o disparo manual de Contas a Pagar pelo servidor deixam de funcionar até essas rotas
  passarem a usar o `firebase-admin`. A notificação de hora em hora (GitHub Actions) não é afetada.
- Ao excluir alguém na tela Equipe, o perfil é removido (a pessoa perde todo o acesso), mas a conta
  continua existindo no Firebase Authentication. Dá para apagá-la no console, se quiser.
