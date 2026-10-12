import { orderRepository } from '@/data';
import { createOrderService } from './orderService';

export const orderService = createOrderService({ orderRepository });
