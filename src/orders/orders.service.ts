import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { paginate } from 'src/common/pagination/paginate';
// Payment processing removed - now handled by Main API (Peach Payments V2)
// import { PaypalPaymentService } from 'src/payment/paypal-payment.service';
// import { StripePaymentService } from 'src/payment/stripe-payment.service';
import { CellerHutOrdersService } from './celler-hut-orders.service';
import { PaymentIntent } from 'src/payment-intent/entries/payment-intent.entity';
import { Setting } from 'src/settings/entities/setting.entity';
import {
  CreateOrderStatusDto,
  UpdateOrderStatusDto,
} from './dto/create-order-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetOrderFilesDto } from './dto/get-downloads.dto';
import {
  GetOrderStatusesDto,
  OrderStatusPaginator,
} from './dto/get-order-statuses.dto';
import { GetOrdersDto, OrderPaginator } from './dto/get-orders.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  CheckoutVerificationDto,
  VerifiedCheckoutData,
} from './dto/verify-checkout.dto';
import { OrderStatus } from './entities/order-status.entity';
import {
  Order,
  OrderFiles,
  OrderStatusType,
  PaymentGatewayType,
  PaymentStatusType,
} from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    private readonly authService: AuthService,
    // Payment services removed - Main API handles all payment processing
    // private readonly stripeService: StripePaymentService,
    // private readonly paypalService: PaypalPaymentService,
    private readonly cellerHutOrdersService: CellerHutOrdersService,
  ) {}
  async create(
    createOrderInput: CreateOrderDto,
    token?: string,
  ): Promise<Order> {
    console.log('[Orders Service] Creating order via Ekasi Cart API...');
    console.log('[Orders Service] Order data:', JSON.stringify(createOrderInput, null, 2));

    try {
      const result = await this.cellerHutOrdersService.create(createOrderInput, token);
      console.log('[Orders Service] Order created successfully:', result.tracking_number);
      return result;
    } catch (error) {
      console.error('[Orders Service] Failed to create order:', error.message);
      if (error.response) {
        console.error('[Orders Service] API Response:', error.response.data);
        console.error('[Orders Service] API Status:', error.response.status);
      }
      throw error;
    }
  }

  async getOrders(
    {
      limit,
      page,
      customer_id,
      tracking_number,
      search,
      shop_id,
    }: GetOrdersDto,
    token?: string,
  ): Promise<OrderPaginator> {
    try {
      return await this.cellerHutOrdersService.getOrders(
        {
          limit,
          page,
          customer_id,
          tracking_number,
          search,
          shop_id,
        },
        token,
      );
    } catch (error) {
      console.error('[Orders Service] Failed to fetch orders:', error.message);
      throw error;
    }
  }

  async getOrderByIdOrTrackingNumber(
    id: string,
    token?: string,
  ): Promise<Order> {
    try {
      return await this.cellerHutOrdersService.getOrderByIdOrTrackingNumber(
        id,
        token,
      );
    } catch (error) {
      console.error('[Orders Service] Failed to fetch order:', error.message);
      throw error;
    }
  }

  getOrderStatuses({
    limit,
    page,
    search,
  }: GetOrderStatusesDto): OrderStatusPaginator {
    // TODO: Implement order statuses endpoint in Ekasi Cart API
    console.warn('[Orders Service] getOrderStatuses not implemented - returning empty results');
    if (!page) page = 1;
    if (!limit) limit = 30;

    const url = `/order-status?search=${search}&limit=${limit}`;
    return {
      data: [],
      ...paginate(0, page, limit, 0, url),
    };
  }

  getOrderStatus(param: string) {
    // TODO: Implement order status endpoint in Ekasi Cart API
    console.warn('[Orders Service] getOrderStatus not implemented');
    return null;
  }

  async update(id: number, updateOrderInput: UpdateOrderDto): Promise<Order> {
    try {
      return await this.cellerHutOrdersService.update(id, updateOrderInput);
    } catch (error) {
      console.error('[Orders Service] Failed to update order:', error.message);
      throw error;
    }
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }

  async verifyCheckout(
    input: CheckoutVerificationDto,
    token?: string,
  ): Promise<VerifiedCheckoutData> {
    try {
      return await this.cellerHutOrdersService.verifyCheckout(input, token);
    } catch (error) {
      console.error('[Orders Service] Failed to verify checkout:', error.message);
      throw error;
    }
  }

  createOrderStatus() {
    // TODO: Implement create order status endpoint in Ekasi Cart API
    console.warn('[Orders Service] createOrderStatus not implemented');
    throw new Error('Creating order statuses is not yet implemented');
  }

  updateOrderStatus() {
    // TODO: Implement update order status endpoint in Ekasi Cart API
    console.warn('[Orders Service] updateOrderStatus not implemented');
    throw new Error('Updating order statuses is not yet implemented');
  }

  async getOrderFileItems({ page, limit }: GetOrderFilesDto) {
    // TODO: Implement digital file downloads endpoint in Ekasi Cart API
    console.warn('[Orders Service] getOrderFileItems not implemented - returning empty results');
    if (!page) page = 1;
    if (!limit) limit = 30;

    const url = `/downloads?&limit=${limit}`;
    return {
      data: [],
      ...paginate(0, page, limit, 0, url),
    };
  }

  async getDigitalFileDownloadUrl(digitalFileId: number) {
    // TODO: Implement digital file download URL endpoint in Ekasi Cart API
    console.warn('[Orders Service] getDigitalFileDownloadUrl not implemented');
    throw new Error('Digital file downloads are not yet implemented');
  }

  async exportOrder(shop_id: string) {
    // TODO: Implement order export endpoint in Ekasi Cart API
    console.warn('[Orders Service] exportOrder not implemented');
    throw new Error('Order export is not yet implemented');
  }

  async downloadInvoiceUrl(shop_id: string) {
    // TODO: Implement invoice download endpoint in Ekasi Cart API
    console.warn('[Orders Service] downloadInvoiceUrl not implemented');
    throw new Error('Invoice download is not yet implemented');
  }

  /**
   * PAYMENT-FIRST FLOW: Validate checkout before payment
   */
  async validateCheckoutForPayment(checkoutData: any, token?: string): Promise<any> {
    try {
      console.log('[Orders Service] Validating checkout for payment-first flow...');
      return await this.cellerHutOrdersService.validateCheckoutForPayment(checkoutData, token);
    } catch (error) {
      console.error('[Orders Service] Failed to validate checkout for payment:', error.message);
      throw error;
    }
  }

  /**
   * PAYMENT-FIRST FLOW: Initiate payment without creating order
   */
  async initiatePaymentFirst(paymentData: any, token?: string): Promise<any> {
    try {
      console.log('[Orders Service] Initiating payment-first flow...');
      return await this.cellerHutOrdersService.initiatePaymentFirst(paymentData, token);
    } catch (error) {
      console.error('[Orders Service] Failed to initiate payment-first:', error.message);
      throw error;
    }
  }

  /**
   * PAYMENT-FIRST FLOW: Get checkout session data
   */
  async getCheckoutSession(sessionId: string, token?: string): Promise<any> {
    try {
      console.log('[Orders Service] Getting checkout session:', sessionId);
      return await this.cellerHutOrdersService.getCheckoutSession(sessionId, token);
    } catch (error) {
      console.error('[Orders Service] Failed to get checkout session:', error.message);
      throw error;
    }
  }

  /**
   * PAYMENT-FIRST FLOW: Verify payment status before creating order
   */
  async verifyPaymentForOrder(data: { checkoutId: string }, token?: string): Promise<any> {
    try {
      console.log('[Orders Service] Verifying payment for order creation:', data.checkoutId);
      return await this.cellerHutOrdersService.verifyPaymentForOrder(data, token);
    } catch (error) {
      console.error('[Orders Service] Failed to verify payment for order:', error.message);
      throw error;
    }
  }

  /**
   * helper methods from here
   */

  /**
   * this method will process children of Order Object
   * @param order
   * @returns Children[]
   */
  processChildrenOrder(order: Order) {
    return [...order.children].map((child) => {
      child.order_status = order.order_status;
      child.payment_status = order.payment_status;
      return child;
    });
  }

  // ============================================================
  // PAYMENT METHODS REMOVED - Main API handles all payments
  // Payment processing now done via Peach Payments V2 in Main API
  // ============================================================

  /*
  **
   * This action will return Payment Intent
   * @param order
   * @param setting
   *
  async processPaymentIntent(
    order: Order,
    setting: Setting,
  ): Promise<PaymentIntent> {
    console.log('[Orders Service] Creating payment intent for order:', order.tracking_number);

    try {
      const {
        id: payment_id,
        client_secret = null,
        redirect_url = null,
        customer = null,
      } = await this.savePaymentIntent(order, order.payment_gateway);

      const is_redirect = redirect_url ? true : false;
      const paymentIntentInfo: PaymentIntent = {
        id: Number(Date.now()),
        order_id: order.id,
        tracking_number: order.tracking_number,
        payment_gateway: order.payment_gateway.toString().toLowerCase(),
        payment_intent_info: {
          client_secret,
          payment_id,
          redirect_url,
          is_redirect,
        },
      };

      console.log('[Orders Service] Payment intent created successfully');
      return paymentIntentInfo;
    } catch (error) {
      console.error('[Orders Service] Failed to create payment intent:', error.message);
      throw error;
    }
  }

  **
   * Trailing method of ProcessPaymentIntent Method
   *
   * @param order
   * @param paymentGateway
   *
  async savePaymentIntent(order: Order, paymentGateway?: string): Promise<any> {
    const me = await this.authService.me();
    switch (order.payment_gateway) {
      case PaymentGatewayType.STRIPE:
        const paymentIntentParam =
          await this.stripeService.makePaymentIntentParam(order, me);
        return await this.stripeService.createPaymentIntent(paymentIntentParam);
      case PaymentGatewayType.PAYPAL:
        // here goes PayPal
        return this.paypalService.createPaymentIntent(order);
        break;

      default:
        //
        break;
    }
  }

  **
   *  Route {order/payment} Submit Payment intent here
   * @param order
   * @param orderPaymentDto
   *
  async stripePay(order: Order) {
    console.log('[Orders Service] Processing Stripe payment for order:', order.id);
    try {
      await this.cellerHutOrdersService.update(order.id, {
        order_status: OrderStatusType.PROCESSING,
        payment_status: PaymentStatusType.SUCCESS,
        payment_intent: null,
      } as any);
      console.log('[Orders Service] Order status updated after Stripe payment');
    } catch (error) {
      console.error('[Orders Service] Failed to update order after Stripe payment:', error.message);
      throw error;
    }
  }

  async paypalPay(order: Order) {
    console.log('[Orders Service] Processing PayPal payment for order:', order.id);
    try {
      const { status } = await this.paypalService.verifyOrder(
        order.payment_intent.payment_intent_info.payment_id,
      );

      if (status === 'COMPLETED') {
        await this.cellerHutOrdersService.update(order.id, {
          order_status: OrderStatusType.PROCESSING,
          payment_status: PaymentStatusType.SUCCESS,
          payment_intent: null,
        } as any);
        console.log('[Orders Service] Order status updated after PayPal payment');
      } else {
        console.warn('[Orders Service] PayPal payment not completed. Status:', status);
      }
    } catch (error) {
      console.error('[Orders Service] Failed to update order after PayPal payment:', error.message);
      throw error;
    }
  }

  **
   * This method will set order status and payment status
   * @param orderId
   * @param orderStatus
   * @param paymentStatus
   *
  async changeOrderPaymentStatus(
    orderId: number,
    orderStatus: OrderStatusType,
    paymentStatus: PaymentStatusType,
  ) {
    console.log('[Orders Service] Updating order payment status:', { orderId, orderStatus, paymentStatus });
    try {
      await this.cellerHutOrdersService.update(orderId, {
        order_status: orderStatus,
        payment_status: paymentStatus,
      } as any);
      console.log('[Orders Service] Order payment status updated successfully');
    } catch (error) {
      console.error('[Orders Service] Failed to update order payment status:', error.message);
      throw error;
    }
  }
  */
}
