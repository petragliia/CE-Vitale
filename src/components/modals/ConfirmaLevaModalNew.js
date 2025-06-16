import React, { useState } from 'react';
import { Modal, Button, Typography, InputNumber, Row, Col } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ConfirmaLevaModalNew = ({
  visible,
  onCancel,
  onConfirm,
  item,
  loading = false
}) => {
  const [quantidade, setQuantidade] = useState(1);
  
  const handleMinus = () => {
    if (quantidade > 1) {
      setQuantidade(quantidade - 1);
    }
  };

  const handlePlus = () => {
    if (item && quantidade < item.quantidade) {
      setQuantidade(quantidade + 1);
    }
  };

  const handleQuantidadeChange = (value) => {
    if (value >= 1 && value <= (item?.quantidade || 1)) {
      setQuantidade(value);
    }
  };

  const handleConfirm = () => {
    onConfirm(quantidade);
  };

  if (!item) return null;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>Confirmar Leva</Title>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancelar
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={handleConfirm}
          loading={loading}
          icon={<PlusOutlined />}
        >
          Confirmar Leva
        </Button>,
      ]}
      width={500}
      centered
    >
      <div style={{ padding: '16px' }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Text strong>Item:</Text> {item.nome}
          </Col>
          <Col span={24}>
            <Text strong>Quantidade disponível:</Text> {item.quantidade} {item.tipoQuantidade}
          </Col>
          <Col span={24}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Text strong>Quantidade:</Text>
              <Button 
                icon={<MinusOutlined />} 
                onClick={handleMinus}
                disabled={quantidade <= 1}
              />
              <InputNumber 
                min={1}
                max={item.quantidade}
                value={quantidade}
                onChange={handleQuantidadeChange}
                style={{ width: '80px', textAlign: 'center' }}
              />
              <Button 
                icon={<PlusOutlined />} 
                onClick={handlePlus}
                disabled={quantidade >= item.quantidade}
              />
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default ConfirmaLevaModalNew;
