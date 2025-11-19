import { Injectable } from '@nestjs/common';
import cellerHutAPI from '../common/celler-hut-client';
import {
  transformCellerHutProduct,
  transformPagination,
} from '../common/data-transformer';
import { GetProductsDto, ProductPaginator } from './dto/get-products.dto';
import { GetPopularProductsDto } from './dto/get-popular-products.dto';
import { GetBestSellingProductsDto } from './dto/get-best-selling-products.dto';

@Injectable()
export class CellerHutProductsService {
  /**
   * Get products from Ekasi Cart API with pagination and filtering
   */
  async getProducts({
    limit,
    page,
    search,
  }: GetProductsDto): Promise<ProductPaginator> {
    try {
      const params: any = {
        page: page || 1,
        limit: limit || 30,
      };

      // Parse search parameters for Ekasi Cart API
      if (search) {
        const searchParams = this.parseSearchParams(search);
        Object.assign(params, searchParams);
      }

      const response = await cellerHutAPI.get('/ecommerce/products', {
        params,
      });

        console.log(response.data);

      // Transform Ekasi Cart response to PickBazar format
      const transformedData = Array.isArray(response.data.data.data)
        ? response.data.data.data.map(transformCellerHutProduct)
        : [];

        console.log({ transformedData });

      // Transform pagination
      const pagination = transformPagination(response.data);

      return {
        data: transformedData,
        ...pagination,
      };
    } catch (error) {
      console.error('[Ekasi Cart Products] Get products failed:', error);
      throw new Error('Failed to fetch products from Ekasi Cart API');
    }
  }

  /**
   * Get product by slug from Ekasi Cart API
   */
  async getProductBySlug(slug: string): Promise<any> {
    try {
      const response = await cellerHutAPI.get(`/ecommerce/products/${slug}`);
      console.log('response', response.data);
      const product = transformCellerHutProduct(response.data.data);
      //   console.log({ product });

      // Get related products based on category
      const relatedProducts = await this.getRelatedProducts(product);
      console.log('relatedProducts', relatedProducts);

      return {
        ...product,
        related_products: relatedProducts,
      };
    } catch (error) {
      console.error('[Ekasi Cart Products] Get product by slug failed:', error);
      throw new Error(`Product with slug "${slug}" not found`);
    }
  }

  /**
   * Get product by ID from Ekasi Cart API
   */
  async getProductById(id: number): Promise<any> {
    try {
      const response = await cellerHutAPI.get(`/ecommerce/products/${id}`);
      return transformCellerHutProduct(response.data);
    } catch (error) {
      console.error('[Ekasi Cart Products] Get product by ID failed:', error);
      throw new Error(`Product with ID "${id}" not found`);
    }
  }

  /**
   * Get popular products from Ekasi Cart API
   */
  async getPopularProducts({
    limit,
    type_slug,
  }: GetPopularProductsDto): Promise<any[]> {
    try {
      const params: any = {
        limit: limit || 10,
        popular: true,
      };

      if (type_slug) {
        params.category = type_slug;
      }

      const response = await cellerHutAPI.get('/ecommerce/products', {
        params,
      });

      return Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutProduct)
        : [];
    } catch (error) {
      console.error(
        '[Ekasi Cart Products] Get popular products failed:',
        error,
      );
      return [];
    }
  }

  /**
   * Get best selling products from Ekasi Cart API
   */
  async getBestSellingProducts({
    limit,
    type_slug,
  }: GetBestSellingProductsDto): Promise<any[]> {
    try {
      const params: any = {
        limit: limit || 10,
        best_selling: true,
      };

      if (type_slug) {
        params.category = type_slug;
      }

      const response = await cellerHutAPI.get('/ecommerce/products', {
        params,
      });

      return Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutProduct)
        : [];
    } catch (error) {
      console.error(
        '[Ekasi Cart Products] Get best selling products failed:',
        error,
      );
      return [];
    }
  }

  /**
   * Get products with low stock from Ekasi Cart API
   */
  async getProductsStock({
    limit,
    page,
    search,
  }: GetProductsDto): Promise<ProductPaginator> {
    try {
      const params: any = {
        page: page || 1,
        limit: limit || 30,
        low_stock: true,
      };

      if (search) {
        const searchParams = this.parseSearchParams(search);
        Object.assign(params, searchParams);
      }

      const response = await cellerHutAPI.get('/ecommerce/products', {
        params,
      });

      const transformedData = Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutProduct)
        : [];

      const pagination = transformPagination(response.data);

      return {
        data: transformedData,
        ...pagination,
      };
    } catch (error) {
      console.error('[Ekasi Cart Products] Get stock products failed:', error);
      throw new Error('Failed to fetch stock products from Ekasi Cart API');
    }
  }

  /**
   * Get draft products from Ekasi Cart API
   */
  async getDraftProducts({
    limit,
    page,
    search,
  }: GetProductsDto): Promise<ProductPaginator> {
    try {
      const params: any = {
        page: page || 1,
        limit: limit || 30,
        status: 'draft',
      };

      if (search) {
        const searchParams = this.parseSearchParams(search);
        Object.assign(params, searchParams);
      }

      const response = await cellerHutAPI.get('/ecommerce/products', {
        params,
      });

      const transformedData = Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutProduct)
        : [];

      const pagination = transformPagination(response.data);

      return {
        data: transformedData,
        ...pagination,
      };
    } catch (error) {
      console.error('[Ekasi Cart Products] Get draft products failed:', error);
      throw new Error('Failed to fetch draft products from Ekasi Cart API');
    }
  }

  /**
   * Search products with liquor-specific filters
   */
  async searchProducts(searchQuery: string, filters: any = {}): Promise<any[]> {
    try {
      const params: any = {
        search: searchQuery,
        limit: filters.limit || 50,
        ...filters,
      };

      // Add liquor-specific search parameters
      if (filters.alcohol_content_min)
        params.alcohol_content_min = filters.alcohol_content_min;
      if (filters.alcohol_content_max)
        params.alcohol_content_max = filters.alcohol_content_max;
      if (filters.volume) params.volume = filters.volume;
      if (filters.origin) params.origin = filters.origin;
      if (filters.vintage) params.vintage = filters.vintage;
      if (filters.price_min) params.price_min = filters.price_min;
      if (filters.price_max) params.price_max = filters.price_max;

      const response = await cellerHutAPI.get('/ecommerce/products/search', {
        params,
      });

      return Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutProduct)
        : [];
    } catch (error) {
      console.error('[Ekasi Cart Products] Search products failed:', error);
      return [];
    }
  }

  /**
   * Get products by category with liquor-specific filtering
   */
  async getProductsByCategory(
    categorySlug: string,
    options: any = {},
  ): Promise<ProductPaginator> {
    try {
      const params: any = {
        category: categorySlug,
        page: options.page || 1,
        limit: options.limit || 30,
        ...options,
      };

      const response = await cellerHutAPI.get('/ecommerce/products', {
        params,
      });

      const transformedData = Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutProduct)
        : [];

      const pagination = transformPagination(response.data);

      return {
        data: transformedData,
        ...pagination,
      };
    } catch (error) {
      console.error(
        '[Ekasi Cart Products] Get products by category failed:',
        error,
      );
      throw new Error(
        `Failed to fetch products for category "${categorySlug}"`,
      );
    }
  }

  /**
   * Parse PickBazar search parameters for Ekasi Cart API
   */
  private parseSearchParams(search: string): any {
    const params: any = {};
    const searchParams = search.split(';');

    for (const param of searchParams) {
      const [key, value] = param.split(':');

      switch (key) {
        case 'name':
          params.search = value;
          break;
        case 'categories':
          params.category = value;
          break;
        case 'type':
          params.type = value;
          break;
        case 'status':
          params.status = value;
          break;
        case 'shop_id':
          params.shop_id = parseInt(value, 10);
          break;
        case 'price_min':
          params.price_min = parseFloat(value);
          break;
        case 'price_max':
          params.price_max = parseFloat(value);
          break;
        // Liquor-specific search parameters
        case 'alcohol_content':
          params.alcohol_content = parseFloat(value);
          break;
        case 'volume':
          params.volume = value;
          break;
        case 'origin':
          params.origin = value;
          break;
        case 'vintage':
          params.vintage = parseInt(value, 10);
          break;
        default:
          params[key] = value;
      }
    }

    return params;
  }

  /**
   * Get related products based on category and type
   */
  private async getRelatedProducts(product: any): Promise<any[]> {
    try {
      const params: any = {
        limit: 10,
        exclude: product.id,
      };

      console.log('product', JSON.stringify(product, null, 2));
      // Try to get related products by category first
      if (product.categories && product.categories.length > 0) {
        params.category = product.categories[0].slug;
      }
      if (product.category) {
        params.category = product.category.slug;
      }

      console.log('params', params);

      const response = await cellerHutAPI.get('/ecommerce/products', {
        params,
      });

      console.log('response', response.data);
      const transformedData = Array.isArray(response.data.data.data)
        ? response.data.data.data.map(transformCellerHutProduct).slice(0, 20)
        : [];
      console.log('transformedData', transformedData);
      return transformedData;
    } catch (error) {
      console.error(
        '[Ekasi Cart Products] Get related products failed:',
        error,
      );
      return [];
    }
  }
}
