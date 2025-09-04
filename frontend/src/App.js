import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import Login from './Login';
import './index.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

function App() {
  const { user, token, logout } = useAuth();
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState(null);
  const [formData, setFormData] = useState({ nome: '', telefone: '', ativo: true });
  const [alert, setAlert] = useState(null);
  const [verificacaoTelefone, setVerificacaoTelefone] = useState('');
  const [resultadoVerificacao, setResultadoVerificacao] = useState(null);

  // Configurar axios com token de autenticação
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      carregarTecnicos();
    }
  }, [user]);

  const carregarTecnicos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/tecnicos`);
      setTecnicos(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        mostrarAlerta('Sessão expirada. Faça login novamente.', 'danger');
        logout();
      } else {
        mostrarAlerta('Erro ao carregar técnicos', 'danger');
      }
    } finally {
      setLoading(false);
    }
  };

  const mostrarAlerta = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const abrirModal = (tecnico = null) => {
    if (tecnico) {
      setEditingTecnico(tecnico);
      setFormData({
        nome: tecnico.nome,
        telefone: tecnico.telefone,
        ativo: tecnico.ativo === 1
      });
    } else {
      setEditingTecnico(null);
      setFormData({ nome: '', telefone: '', ativo: true });
    }
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditingTecnico(null);
    setFormData({ nome: '', telefone: '', ativo: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingTecnico) {
        await axios.put(`${API_BASE_URL}/tecnicos/${editingTecnico.id}`, formData);
        mostrarAlerta('Técnico atualizado com sucesso!', 'success');
      } else {
        await axios.post(`${API_BASE_URL}/tecnicos`, formData);
        mostrarAlerta('Técnico criado com sucesso!', 'success');
      }
      
      fecharModal();
      carregarTecnicos();
    } catch (error) {
      const message = error.response?.data?.error || 'Erro ao salvar técnico';
      mostrarAlerta(message, 'danger');
    }
  };

  const deletarTecnico = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este técnico?')) {
      try {
        await axios.delete(`${API_BASE_URL}/tecnicos/${id}`);
        mostrarAlerta('Técnico deletado com sucesso!', 'success');
        carregarTecnicos();
      } catch (error) {
        mostrarAlerta('Erro ao deletar técnico', 'danger');
      }
    }
  };

  const verificarTecnico = async () => {
    if (!verificacaoTelefone.trim()) {
      mostrarAlerta('Digite um número de telefone', 'danger');
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/verificar-tecnico/${verificacaoTelefone}`);
      setResultadoVerificacao({
        autorizado: response.data.autorizado,
        message: response.data.message,
        tecnico: response.data.tecnico,
        status: response.status
      });
    } catch (error) {
      setResultadoVerificacao({
        autorizado: false,
        message: error.response?.data?.message || 'Erro ao verificar técnico',
        status: error.response?.status || 500
      });
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      mostrarAlerta('Logout realizado com sucesso', 'success');
    } else {
      mostrarAlerta('Erro ao fazer logout', 'danger');
    }
  };

  // Se não estiver autenticado, mostrar tela de login
  if (!user) {
    return <Login />;
  }

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Gerenciamento de Técnicos</h1>
            <p>Sistema para gerenciar técnicos autorizados a usar o chatbot</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 10px 0', color: '#666' }}>
              Logado como: <strong>{user.email}</strong>
            </p>
            <button className="btn btn-danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {/* Seção de Verificação */}
      <div className="card">
        <h2>Verificar Técnico</h2>
        <p>Digite o número de telefone para verificar se o técnico está autorizado:</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Ex: 11999999999"
            value={verificacaoTelefone}
            onChange={(e) => setVerificacaoTelefone(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={verificarTecnico}>
            Verificar
          </button>
        </div>
        
        {resultadoVerificacao && (
          <div className={`alert ${resultadoVerificacao.autorizado ? 'alert-success' : 'alert-danger'}`}>
            <strong>Status: {resultadoVerificacao.status}</strong><br/>
            {resultadoVerificacao.message}
            {resultadoVerificacao.tecnico && (
              <div style={{ marginTop: '10px' }}>
                <strong>Técnico:</strong> {resultadoVerificacao.tecnico.nome}<br/>
                <strong>Telefone:</strong> {resultadoVerificacao.tecnico.telefone}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de Técnicos */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Lista de Técnicos</h2>
          <button className="btn btn-success" onClick={() => abrirModal()}>
            + Novo Técnico
          </button>
        </div>

        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Status</th>
                <th>Data Criação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.map((tecnico) => (
                <tr key={tecnico.id}>
                  <td>{tecnico.id}</td>
                  <td>{tecnico.nome}</td>
                  <td>{tecnico.telefone}</td>
                  <td>
                    <span className={`status-badge ${tecnico.ativo ? 'status-active' : 'status-inactive'}`}>
                      {tecnico.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>{formatarData(tecnico.data_criacao)}</td>
                  <td>
                    <button 
                      className="btn btn-warning" 
                      onClick={() => abrirModal(tecnico)}
                    >
                      Editar
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => deletarTecnico(tecnico.id)}
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tecnicos.length === 0 && !loading && (
          <div className="alert alert-info">
            Nenhum técnico cadastrado. Clique em "Novo Técnico" para adicionar.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingTecnico ? 'Editar Técnico' : 'Novo Técnico'}</h2>
              <button className="close" onClick={fecharModal}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="nome">Nome:</label>
                <input
                  type="text"
                  id="nome"
                  className="form-control"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="telefone">Telefone:</label>
                <input
                  type="text"
                  id="telefone"
                  className="form-control"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="Ex: 11999999999"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  />
                  {' '}Ativo
                </label>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={fecharModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTecnico ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
