import React, { useState, useEffect } from 'react';
import { Modal, InputNumber, DatePicker, Form, Button, message } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import moment from 'moment';
import './ModalAjusteQuantidade.css';

const ModalAjusteQuantidade = ({
  open,
  onCancel,
  onConfirm,
  produto,
  operacao = 'adicionar' // 'adicionar' ou 'remover'
}) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        quantidade: 1,
        validade: moment().add(30, 'days')
      });
    }
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      
      await onConfirm({
        ...values,
        quantidade: operacao === 'adicionar' ? values.quantidade : -values.quantidade
      });
      
      message.success(`Quantidade ${operacao === 'adicionar' ? 'adicionada' : 'removida'} com sucesso!`);
      onCancel();
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      message.error('Ocorreu um erro ao atualizar a quantidade');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <Modal
      title={`${operacao === 'adicionar' ? 'Adicionar' : 'Remover'} Quantidade`}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancelar
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleSubmit}
          loading={confirmLoading}
          icon={operacao === 'adicionar' ? <PlusOutlined /> : <MinusOutlined />}
        >
          {operacao === 'adicionar' ? 'Adicionar' : 'Remover'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Quantidade"
          name="quantidade"
          rules={[{ required: true, message: 'Informe a quantidade' }]}
        >
          <InputNumber 
            min={1} 
            max={operacao === 'remover' ? (produto?.quantidade || 0) : undefined}
            style={{ width: '100%' }} 
            placeholder="Quantidade"
          />
        </Form.Item>
        
        {operacao === 'adicionar' && (
          <Form.Item
            label="Validade"
            name="validade"
            rules={[{ required: true, message: 'Informe a data de validade' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              format="DD/MM/YYYY"
              disabledDate={(current) => current && current < moment().startOf('day')}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default ModalAjusteQuantidade;
