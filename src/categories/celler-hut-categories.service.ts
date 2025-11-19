import { Injectable } from '@nestjs/common';
import cellerHutAPI from '../common/celler-hut-client';
import {
  transformCellerHutCategory,
  transformPagination,
} from '../common/data-transformer';
import { CreateCategoryDto } from './dto/create-category.dto';
import { GetCategoriesDto } from './dto/get-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CellerHutCategoriesService {
  /**
   * Create category in Ekasi Cart API
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      const response = await cellerHutAPI.post(
        '/categories',
        createCategoryDto,
      );
      return transformCellerHutCategory(response.data);
    } catch (error) {
      console.error('[Ekasi Cart Categories] Create category failed:', error);
      throw new Error('Failed to create category in Ekasi Cart API');
    }
  }

  /**
   * Get categories from Ekasi Cart API with pagination and filtering
   */
  async getCategories({
    limit,
    page,
    search,
    parent,
  }: GetCategoriesDto): Promise<any> {
    try {
      const params: any = {
        page: page || 1,
        limit: limit || 15,
      };

      // Add filters
      if (search) {
        const searchParams = this.parseSearchParams(search);
        Object.assign(params, searchParams);
      }

      if (parent === 'null') {
        params.parent_id = null;
      } else if (parent) {
        params.parent_id = parent;
      }

      const response = await cellerHutAPI.get('/ecommerce/categories', {
        params,
      });
      console.log(response.data.data);

      // Transform Ekasi Cart response to PickBazar format
      const transformedData = Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutCategory)
        : [];

      // Transform pagination
      const pagination = transformPagination(response.data);

      return {
        data: transformedData,
        ...pagination,
      };
    } catch (error) {
      console.error('[Ekasi Cart Categories] Get categories failed:', error);
      throw new Error('Failed to fetch categories from Ekasi Cart API');
    }
  }

  /**
   * Get category by ID or slug from Ekasi Cart API
   */
  async getCategory(param: string, language: string): Promise<Category> {
    try {
      const response = await cellerHutAPI.get(
        `/ecommerce/categories/${param}`,
        {
          params: { language },
        },
      );

      return transformCellerHutCategory(response.data);
    } catch (error) {
      console.error('[Ekasi Cart Categories] Get category failed:', error);
      throw new Error(`Category with identifier "${param}" not found`);
    }
  }

  /**
   * Update category in Ekasi Cart API
   */
  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    try {
      const response = await cellerHutAPI.put(
        `/ecommerce/categories/${id}`,
        updateCategoryDto,
      );
      return transformCellerHutCategory(response.data);
    } catch (error) {
      console.error('[Ekasi Cart Categories] Update category failed:', error);
      throw new Error(`Failed to update category ${id} in Ekasi Cart API`);
    }
  }

  /**
   * Delete category from Ekasi Cart API
   */
  async remove(id: number): Promise<string> {
    try {
      await cellerHutAPI.delete(`/ecommerce/categories/${id}`);
      return `Category #${id} has been successfully removed`;
    } catch (error) {
      console.error('[Ekasi Cart Categories] Remove category failed:', error);
      throw new Error(`Failed to remove category ${id} from Ekasi Cart API`);
    }
  }

  /**
   * Get liquor categories with specific filtering
   */
  async getLiquorCategories(options: any = {}): Promise<Category[]> {
    try {
      const params: any = {
        liquor_only: true,
        limit: options.limit || 50,
        ...options,
      };

      const response = await cellerHutAPI.get('/ecommerce/categories', {
        params,
      });

      return Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutCategory)
        : [];
    } catch (error) {
      console.error(
        '[Ekasi Cart Categories] Get liquor categories failed:',
        error,
      );
      return [];
    }
  }

  /**
   * Get category hierarchy from Ekasi Cart API
   */
  async getCategoryHierarchy(): Promise<Category[]> {
    try {
      const response = await cellerHutAPI.get(
        '/ecommerce/categories/hierarchy',
      );

      return Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutCategory)
        : [];
    } catch (error) {
      console.error(
        '[Ekasi Cart Categories] Get category hierarchy failed:',
        error,
      );
      return [];
    }
  }

  /**
   * Get categories by type (wine, spirits, beer, etc.)
   */
  async getCategoriesByType(liquorType: string): Promise<Category[]> {
    try {
      const params = {
        liquor_type: liquorType,
        limit: 100,
      };

      const response = await cellerHutAPI.get('/ecommerce/categories', {
        params,
      });

      return Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutCategory)
        : [];
    } catch (error) {
      console.error(
        '[Ekasi Cart Categories] Get categories by type failed:',
        error,
      );
      return [];
    }
  }

  /**
   * Get parent categories from Ekasi Cart API
   */
  async getParentCategories(): Promise<Category[]> {
    try {
      const params = {
        parent_only: true,
        limit: 50,
      };

      const response = await cellerHutAPI.get('/ecommerce/categories', {
        params,
      });

      return Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutCategory)
        : [];
    } catch (error) {
      console.error(
        '[Ekasi Cart Categories] Get parent categories failed:',
        error,
      );
      return [];
    }
  }

  /**
   * Get child categories for a parent category
   */
  async getChildCategories(parentId: number): Promise<Category[]> {
    try {
      const params = {
        parent_id: parentId,
        limit: 100,
      };

      const response = await cellerHutAPI.get('/ecommerce/categories', {
        params,
      });

      return Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutCategory)
        : [];
    } catch (error) {
      console.error(
        '[Ekasi Cart Categories] Get child categories failed:',
        error,
      );
      return [];
    }
  }

  /**
   * Search categories with liquor-specific filters
   */
  async searchCategories(
    searchQuery: string,
    filters: any = {},
  ): Promise<Category[]> {
    try {
      const params: any = {
        search: searchQuery,
        limit: filters.limit || 50,
        ...filters,
      };

      // Add liquor-specific search parameters
      if (filters.liquor_type) params.liquor_type = filters.liquor_type;
      if (filters.origin) params.origin = filters.origin;
      if (filters.has_products) params.has_products = filters.has_products;

      const response = await cellerHutAPI.get('/ecommerce/categories/search', {
        params,
      });

      return Array.isArray(response.data.data)
        ? response.data.data.map(transformCellerHutCategory)
        : [];
    } catch (error) {
      console.error('[Ekasi Cart Categories] Search categories failed:', error);
      return [];
    }
  }

  /**
   * Get category statistics from Ekasi Cart API
   */
  async getCategoryStats(categoryId: number): Promise<any> {
    try {
      const response = await cellerHutAPI.get(
        `/ecommerce/categories/${categoryId}/stats`,
      );
      return {
        total_products: response.data.total_products || 0,
        active_products: response.data.active_products || 0,
        average_price: response.data.average_price || 0,
        price_range: response.data.price_range || { min: 0, max: 0 },
        subcategories_count: response.data.subcategories_count || 0,
      };
    } catch (error) {
      console.error(
        '[Ekasi Cart Categories] Get category stats failed:',
        error,
      );
      return {
        total_products: 0,
        active_products: 0,
        average_price: 0,
        price_range: { min: 0, max: 0 },
        subcategories_count: 0,
      };
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
        case 'type':
          params.liquor_type = value;
          break;
        case 'parent':
          params.parent_id = value === 'null' ? null : value;
          break;
        case 'slug':
          params.slug = value;
          break;
        default:
          params[key] = value;
      }
    }

    return params;
  }
}
