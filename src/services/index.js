import {
  authRepository,
  cashClosingRepository,
  menuRepository,
  orderRepository,
  userRepository,
} from '@/data';
import { createAuthService } from './authService';
import { createCashClosingService } from './cashClosingService';
import { createMenuService } from './menuService';
import { createOrderService } from './orderService';
import { createUserService } from './userService';

export const orderService = createOrderService({ orderRepository });
export const authService = createAuthService({ authRepository });
export const userService = createUserService({ userRepository });
export const menuService = createMenuService({ menuRepository });
export const cashClosingService = createCashClosingService({ cashClosingRepository });
