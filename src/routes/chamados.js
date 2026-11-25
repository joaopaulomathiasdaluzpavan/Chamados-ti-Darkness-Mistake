const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const chamados = require('../controllers/chamadosController');
const comentarios = require('../controllers/comentariosController');

const router = express.Router();

// Toda rota com :id carrega o chamado antes (req.chamado) ou responde 404.
router.param('id', asyncHandler(chamados.carregar));

router.get('/', asyncHandler(chamados.index));
router.get('/novo', chamados.novo); // precisa vir antes de /:id
router.post('/', asyncHandler(chamados.criar));

router.get('/:id', asyncHandler(chamados.mostrar));
router.get('/:id/editar', chamados.editar);
router.post('/:id/editar', asyncHandler(chamados.atualizar));
router.post('/:id/andamento', asyncHandler(chamados.atualizarAndamento));
router.post('/:id/comentarios', asyncHandler(comentarios.criar));
router.post('/:id/excluir', asyncHandler(chamados.excluir));

// Middleware simples para exigir perfil admin
function exigirAdmin(req, res, next) {
  const role = req.session?.userRole || 'user';
  if (role !== 'admin') {
    return res.status(403).redirect('/chamados?erro=Apenas+administradores+podem+excluir+chamados');
  }
  next();
}

// Na rota de exclusão já existente, basta encaixar o exigirAdmin no meio:
router.post('/chamados/:id/excluir', exigirAdmin, (req, res) => {
  // ... mantenha o seu código atual de exclusão aqui dentro ...
});

module.exports = router;
