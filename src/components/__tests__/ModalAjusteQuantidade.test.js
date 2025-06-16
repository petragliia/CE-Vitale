import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModalAjusteQuantidade from '../ModalAjusteQuantidade';
import moment from 'moment';
import { message } from 'antd';

// Mock para o módulo antd
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

// Mock para o produto
const mockProduto = {
  id: '1',
  nome: 'Produto Teste',
  quantidade: 10,
};

// Mock para as funções de callback
const mockOnCancel = jest.fn();
const mockOnConfirm = jest.fn().mockResolvedValue({});

describe('ModalAjusteQuantidade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renderiza corretamente em modo de adição', async () => {
    render(
      <ModalAjusteQuantidade
        open={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        produto={mockProduto}
        operacao="adicionar"
      />
    );

    // Aguarda a renderização completa
    await waitFor(() => {
      expect(screen.getByText('Adicionar Quantidade')).toBeInTheDocument();
    });
    
    // Verificamos os rótulos de campo
    expect(screen.getByText('Quantidade')).toBeInTheDocument();
    expect(screen.getByText('Validade')).toBeInTheDocument();
    
    // Verificamos os botões
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  test('renderiza corretamente em modo de remoção', async () => {
    render(
      <ModalAjusteQuantidade
        open={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        produto={mockProduto}
        operacao="remover"
      />
    );

    // Aguarda a renderização completa
    await waitFor(() => {
      expect(screen.getByText('Remover Quantidade')).toBeInTheDocument();
    });
    
    // Verificamos os rótulos de campo
    expect(screen.getByText('Quantidade')).toBeInTheDocument();
    
    // Campo de validade não deve existir no modo de remoção
    expect(screen.queryByText('Validade')).not.toBeInTheDocument();
    
    // Verificamos os botões
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Remover')).toBeInTheDocument();
  });

  test('chama onCancel quando botão Cancelar é clicado', async () => {
    render(
      <ModalAjusteQuantidade
        open={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        produto={mockProduto}
        operacao="adicionar"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancelar'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('chama onConfirm com valores corretos ao adicionar quantidade', async () => {
    render(
      <ModalAjusteQuantidade
        open={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        produto={mockProduto}
        operacao="adicionar"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Adicionar')).toBeInTheDocument();
    });

    // Preenche o campo quantidade
    const quantidadeInput = screen.getByRole('spinbutton');
    fireEvent.change(quantidadeInput, { target: { value: '5' } });
    
    // Clica no botão Adicionar
    fireEvent.click(screen.getByText('Adicionar'));
    
    // Espera pela resolução da promessa
    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm.mock.calls[0][0].quantidade).toBe(5);
    });
    
    expect(message.success).toHaveBeenCalledWith('Quantidade adicionada com sucesso!');
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('chama onConfirm com valores corretos ao remover quantidade', async () => {
    render(
      <ModalAjusteQuantidade
        open={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        produto={mockProduto}
        operacao="remover"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Remover')).toBeInTheDocument();
    });

    // Preenche o campo quantidade
    const quantidadeInput = screen.getByRole('spinbutton');
    fireEvent.change(quantidadeInput, { target: { value: '3' } });
    
    // Clica no botão Remover
    fireEvent.click(screen.getByText('Remover'));
    
    // Espera pela resolução da promessa
    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm.mock.calls[0][0].quantidade).toBe(-3);
    });
    
    expect(message.success).toHaveBeenCalledWith('Quantidade removida com sucesso!');
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('exibe mensagem de erro quando onConfirm falha', async () => {
    const mockOnConfirmError = jest.fn().mockRejectedValue(new Error('Erro ao atualizar'));
    
    // Mock console.error para suprimir o warning esperado
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    render(
      <ModalAjusteQuantidade
        open={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirmError}
        produto={mockProduto}
        operacao="adicionar"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Adicionar')).toBeInTheDocument();
    });

    // Clica no botão Adicionar
    fireEvent.click(screen.getByText('Adicionar'));
    
    // Espera pela rejeição da promessa
    await waitFor(() => {
      expect(mockOnConfirmError).toHaveBeenCalledTimes(1);
    });
    
    expect(message.error).toHaveBeenCalledWith('Ocorreu um erro ao atualizar a quantidade');
    expect(mockOnCancel).not.toHaveBeenCalled();
    
    // Restaura console.error
    console.error = originalConsoleError;
  });

  test('limita a quantidade máxima no modo de remoção', async () => {
    render(
      <ModalAjusteQuantidade
        open={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        produto={mockProduto}
        operacao="remover"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Remover Quantidade')).toBeInTheDocument();
    });
    
    // Preenche o campo quantidade
    const quantidadeInput = screen.getByRole('spinbutton');
    fireEvent.change(quantidadeInput, { target: { value: '5' } });
    
    // Clica no botão Remover
    fireEvent.click(screen.getByText('Remover'));
    
    // Espera pela resolução da promessa
    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalled();
      expect(mockOnConfirm.mock.calls[0][0].quantidade).toBe(-5);
    });
  });
});
