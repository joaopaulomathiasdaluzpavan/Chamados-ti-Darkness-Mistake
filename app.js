const path = require('path');
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const { sequelize } = require('./models');
const routes = require('./routes');
const locals = require('./middlewares/locals');
const seed = require('./seeders/seed');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares de leitura de corpo e formulários
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Sessão no Express
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'helpdesk-ti-secret-dev',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' }
  })
);

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rota inicial servindo o login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Recebe o perfil sincronizado pelo firebaseauth.js após o login
app.post('/auth/session', (req, res) => {
  const { uid, email, perfil } = req.body || {};
  const allowedRoles = ['user', 'tecnico', 'admin'];
  const role = allowedRoles.includes(perfil) ? perfil : 'user';

  req.session.uid = uid || null;
  req.session.email = email || null;
  req.session.userRole = role;

  return res.json({ ok: true, userRole: role });
});

// Disponibiliza userRole e currentUserId para todas as views EJS
app.use((req, res, next) => {
  res.locals.userRole = req.session?.userRole || 'user';
  res.locals.currentUserId = req.session?.uid || null;
  next();
});

app.use(locals);

// Rotas
app.use(routes);

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Página não encontrada' });
});

// Erros
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Erro', error: err });
});

(async () => {
  try {
    await sequelize.sync();
    await seed({ onlyIfEmpty: true });
    app.listen(PORT, () => {
      console.log(`\n  HelpDesk TI rodando em http://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('Falha ao iniciar a aplicação:', err);
    process.exit(1);
  }
})();