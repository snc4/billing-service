export type CurrentPlan = {
  isActive: boolean;
  planInfo?: {
    productCode?: string;
    nextChargeDate?: Date | string;
    managementUrl?: string;
    subscriptionId: string;
  };
  options?: any;
};
