import React from 'react';
import { Card, Tag, Button, Tooltip, Badge, Space, Typography } from 'antd';
import { 
  PlusOutlined, 
  MinusOutlined, 
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import moment from 'moment';
import './ProdutoCard.css';

const { Text, Title } = Typography;

const ProdutoCard = ({ 
  produto, 
  onAdd, 
  onRemove, 
  onEdit, 
  onDelete,
  onViewDetails
}) => {
  const {
    nome,
    quantidade,
    unidadeMedida,
    validade,
    categoria,
    lote
  } = produto;

  // Verifica se o produto está com estoque baixo
  const isEstoqueBaixo = quantidade < 5;
  const isEstoqueCritico = quantidade < 2;
  
  // Formata a data de validade
  const formatarValidade = (data) => {
    if (!data) return 'Sem validade';
    
    const hoje = moment().startOf('day');
    const dataValidade = moment(data).startOf('day');
    const diasRestantes = dataValidade.diff(hoje, 'days');
    
    if (diasRestantes < 0) return 'Vencido';
    if (diasRestantes === 0) return 'Vence hoje';
    if (diasRestantes === 1) return 'Vence amanhã';
    if (diasRestantes <= 7) return `Vence em ${diasRestantes} dias`;
    
    return `Validade: ${dataValidade.format('DD/MM/YYYY')}`;
  };

  // Obtém a cor do status
  const getStatusColor = () => {
    if (isEstoqueCritico) return 'error';
    if (isEstoqueBaixo) return 'warning';
    return 'success';
  };

  // Obtém o texto do status
  const getStatusText = () => {
    if (isEstoqueCritico) return 'Crítico';
    if (isEstoqueBaixo) return 'Baixo';
    return 'Disponível';
  };

  return (
    <Badge.Ribbon 
      text={categoria} 
      color={categoria === 'Medicamentos' ? 'blue' : categoria === 'Insumos' ? 'green' : 'orange'}
      className="categoria-ribbon"
    >
      <Card 
        className="produto-card"
        hoverable
        actions={[
          <Tooltip key="add" title="Adicionar estoque">
            <Button 
              type="text" 
              icon={<PlusOutlined />} 
              onClick={(e) => {
                e.stopPropagation();
                onAdd(produto);
              }}
            />
          </Tooltip>,
          <Tooltip key="remove" title="Remover do estoque">
            <Button 
              type="text" 
              icon={<MinusOutlined />} 
              onClick={(e) => {
                e.stopPropagation();
                onRemove(produto);
              }}
              disabled={quantidade <= 0}
            />
          </Tooltip>,
          <Tooltip key="details" title="Ver detalhes">
            <Button 
              type="text" 
              icon={<InfoCircleOutlined />} 
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(produto);
              }}
            />
          </Tooltip>
        ]}
      >
        <div className="produto-card-content">
          <div className="produto-header">
            <Title level={5} ellipsis={{ rows: 2 }} className="produto-nome">
              {nome}
            </Title>
            
            <Tag 
              color={getStatusColor()}
              className="status-tag"
            >
              {getStatusText()}
            </Tag>
          </div>
          
          <div className="produto-info">
            <div className="info-item">
              <Text type="secondary">Quantidade:</Text>
              <Text strong className="quantidade">
                {quantidade} {unidadeMedida || 'un'}
              </Text>
            </div>
            
            <div className="info-item">
              <Text type="secondary">Lote:</Text>
              <Text>{lote || 'N/A'}</Text>
            </div>
            
            <div className="info-item">
              <Text type="secondary">Validade:</Text>
              <Text 
                type={validade && moment(validade).isBefore(moment().add(7, 'days')) ? 'danger' : undefined}
              >
                {formatarValidade(validade)}
              </Text>
            </div>
          </div>
          
          <div className="produto-actions">
            <Space>
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(produto);
                }}
              >
                Editar
              </Button>
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(produto);
                }}
              >
                Excluir
              </Button>
            </Space>
          </div>
        </div>
      </Card>
    </Badge.Ribbon>
  );
};

export default ProdutoCard;
