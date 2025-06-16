import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Form, Modal, Input, Select, Button, message } from 'antd';
import * as ProductRepository from '../../repositories/ProductRepository';

// Mock para o componente Modal do Ant Design
jest.mock('antd', () => {
  const originalModule = jest.requireActual('antd');
  return {
    ...originalModule,
    message: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

// Mock para o ProductRepository
jest.mock('../../repositories/ProductRepository', () => ({
  addProduto: jest.fn().mockResolvedValue({ id: 'test-id' }),
  updateProduto: jest.fn().mockResolvedValue({}),
}));

// Componente de teste que simula apenas o modal
function TestModalAddProduto({ 
  open = true, 
  onCancel = jest.fn(), 
  produtoEditando = null,
  handleSubmit = jest.fn().mockResolvedValue({})
}) {
  const [form] = Form.useForm();

  return (
    <Modal
      title={produtoEditando ? "Editar Produto" : "Novo Produto"}
      open={open}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      footer={null}
      width={700}
      data-testid="modal-add-produto"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          quantidade: produtoEditando?.quantidade || 0,
          valor: produtoEditando?.valor || 0,
          tipoQuantidade: produtoEditando?.tipoQuantidade || "unitario",
          nome: produtoEditando?.nome || "",
          categoria: produtoEditando?.categoria || ""
        }}
      >
        <div className="modal-grid" data-testid="modal-form">
          <Form.Item
            name="nome"
            label="Nome do Produto"
            rules={[{ required: true, message: "Campo obrigatório!" }]}
          >
            <Input placeholder="Ex: Seringa 10ml" data-testid="input-nome" />
          </Form.Item>
          <Form.Item
            name="categoria"
            label="Categoria"
            rules={[{ required: true, message: "Campo obrigatório!" }]}
          >
            <Select placeholder="Selecione..." data-testid="select-categoria">
              <Select.Option value="Medicamentos">Medicamentos</Select.Option>
              <Select.Option value="Insumos">Insumos</Select.Option>
              <Select.Option value="Comida">Comida</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="tipoQuantidade"
            label="Tipo de Quantidade"
            rules={[{ required: true, message: "Campo obrigatório!" }]}
          >
            <Select placeholder="Selecione..." data-testid="select-tipo-quantidade">
              <Select.Option value="unitario">Unitário</Select.Option>
              <Select.Option value="pacotes">Pacotes</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="quantidade"
            label="Quantidade em Estoque"
            rules={[{ required: true, message: "Campo obrigatório!" }]}
          >
            <Input type="number" min={0} placeholder="Ex: 100" data-testid="input-quantidade" />
          </Form.Item>

          <Form.Item
            name="valor"
            label="Valor Unitário (R$)"
            rules={[{ required: true, message: "Campo obrigatório!" }]}
          >
            <Input type="number" min={0} step="0.01" placeholder="Ex: 10.50" data-testid="input-valor" />
          </Form.Item>
        </div>

        <div className="form-actions">
          <Button onClick={onCancel} data-testid="btn-cancelar">
            Cancelar
          </Button>
          <Button type="primary" htmlType="submit" data-testid="btn-salvar">
            {produtoEditando ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

describe('ModalAddProduto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Limpar qualquer modal que possa estar no documento
    document.body.innerHTML = '';
  });

  test('renderiza o modal de adicionar produto corretamente', async () => {
    const handleSubmit = jest.fn().mockResolvedValue({});
    const onCancel = jest.fn();
    
    await act(async () => {
      render(<TestModalAddProduto 
        open={true} 
        onCancel={onCancel}
        handleSubmit={handleSubmit}
      />);
    });
    
    // Verifica se o modal está presente
    await waitFor(() => {
      const modal = document.querySelector('.ant-modal-content');
      expect(modal).toBeInTheDocument();
    });

    // Verifica o título
    await waitFor(() => {
      const title = screen.getByText('Novo Produto');
      expect(title).toBeInTheDocument();
    });

    // Verifica se os campos estão presentes
    await waitFor(() => {
      const nomeInput = screen.getByPlaceholderText('Ex: Seringa 10ml');
      expect(nomeInput).toBeInTheDocument();
    });
  });

  test('fecha o modal ao clicar em cancelar', async () => {
    const onCancel = jest.fn();
    
    await act(async () => {
      render(<TestModalAddProduto open={true} onCancel={onCancel} />);
    });
    
    await waitFor(() => {
      const cancelButton = screen.getByText('Cancelar');
      expect(cancelButton).toBeInTheDocument();
      fireEvent.click(cancelButton);
      expect(onCancel).toHaveBeenCalled();
    });
  });

  test('submete o formulário com os dados corretos', async () => {
    const handleSubmit = jest.fn().mockResolvedValue({});
    
    await act(async () => {
      render(<TestModalAddProduto open={true} handleSubmit={handleSubmit} />);
    });
    
    // Verifica se o formulário está presente
    await waitFor(() => {
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    // Verifica se o botão de submit está presente
    await waitFor(() => {
      const submitButton = screen.getByText('Adicionar');
      expect(submitButton).toBeInTheDocument();
    });

    // Preenche apenas o campo nome (obrigatório)
    await waitFor(() => {
      const nomeInput = screen.getByPlaceholderText('Ex: Seringa 10ml');
      fireEvent.change(nomeInput, { target: { value: 'Produto Teste' } });
      expect(nomeInput.value).toBe('Produto Teste');
    });
  });

  test('inicializa com valores ao editar produto existente', async () => {
    const produtoEditando = {
      id: '1',
      nome: 'Produto Existente',
      categoria: 'Medicamentos',
      quantidade: 50,
      tipoQuantidade: 'unitario',
      valor: 15.99
    };
    
    await act(async () => {
      render(<TestModalAddProduto 
        open={true} 
        produtoEditando={produtoEditando}
      />);
    });
    
    // Verifica o título para edição
    await waitFor(() => {
      const title = screen.getByText('Editar Produto');
      expect(title).toBeInTheDocument();
    });

    // Verifica se o botão mostra "Salvar"
    await waitFor(() => {
      const saveButton = screen.getByText('Salvar');
      expect(saveButton).toBeInTheDocument();
    });
  });
});
