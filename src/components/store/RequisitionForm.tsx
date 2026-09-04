import React from 'react';
import { StoreRequisition, StoreRequisitionProps } from './StoreRequisition';

export interface RequisitionFormProps extends StoreRequisitionProps {}

export const RequisitionForm: React.FC<RequisitionFormProps> = (props) => {
  return <StoreRequisition {...props} />;
};

export default RequisitionForm;
