const constants = require('../config/constants');
const helpers = require('../utils/helpers');

module.exports = (req, res, next) => {
  Object.assign(res.locals, constants, helpers);
  res.locals.msg = req.query.msg || null;
  res.locals.erro = req.query.erro || null;
  res.locals.currentPath = req.path;
  res.locals.title = 'HelpDesk TI';

  res.locals.C = constants;
  res.locals.fmt = helpers;
  res.locals.caminho = req.originalUrl.split('?')[0];
  res.locals.aviso = constants.MENSAGENS?.[req.query.ok] || null;
  res.locals.erroGeral = constants.ERROS?.[req.query.erro] || null;

  const sessUser = req.session?.user || req.session?.usuario || null;
  const role = req.session?.userRole || sessUser?.perfil || sessUser?.role || 'user';

  res.locals.userRole = role;
  res.locals.currentUserId = req.session?.uid || sessUser?.uid || null;
  res.locals.usuarioLogado = sessUser
    ? {
        nome: sessUser.nome || sessUser.displayName || 'Usuário',
        email: sessUser.email || '',
        role,
      }
    : {
        nome: 'Conta ativa',
        email: '',
        role,
      };

  next();
};