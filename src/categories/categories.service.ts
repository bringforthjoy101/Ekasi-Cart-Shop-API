import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { GetCategoriesDto } from './dto/get-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { CellerHutCategoriesService } from './celler-hut-categories.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly cellerHutCategoriesService: CellerHutCategoriesService,
  ) {}

  /**
   * Create a new category using Ekasi Cart API
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      return await this.cellerHutCategoriesService.create(createCategoryDto);
    } catch (error) {
      console.error('[Categories Service] Create failed:', error);
      throw error;
    }
  }

  /**
   * Get categories with pagination and filtering from Ekasi Cart API
   */
  async getCategories(params: GetCategoriesDto): Promise<any> {
    try {
      return await this.cellerHutCategoriesService.getCategories(params);
    } catch (error) {
      console.error('[Categories Service] Get categories failed:', error);
      // Fallback to empty result with proper pagination structure
      return {
        data: [],
        paginatorInfo: {
          count: 0,
          currentPage: params.page || 1,
          firstItem: 0,
          lastItem: 0,
          lastPage: 1,
          perPage: params.limit || 15,
          total: 0,
        },
      };
    }
  }

  /**
   * Get a single category by ID or slug from Ekasi Cart API
   */
  async getCategory(param: string, language: string): Promise<Category> {
    try {
      return await this.cellerHutCategoriesService.getCategory(param, language);
    } catch (error) {
      console.error('[Categories Service] Get category failed:', error);
      throw error;
    }
  }

  /**
   * Update a category using Ekasi Cart API
   */
  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    try {
      return await this.cellerHutCategoriesService.update(
        id,
        updateCategoryDto,
      );
    } catch (error) {
      console.error('[Categories Service] Update failed:', error);
      throw error;
    }
  }

  /**
   * Remove a category using Ekasi Cart API
   */
  async remove(id: number): Promise<string> {
    try {
      return await this.cellerHutCategoriesService.remove(id);
    } catch (error) {
      console.error('[Categories Service] Remove failed:', error);
      throw error;
    }
  }

  /**
   * Get liquor-specific categories
   */
  async getLiquorCategories(options: any = {}): Promise<Category[]> {
    try {
      return await this.cellerHutCategoriesService.getLiquorCategories(options);
    } catch (error) {
      console.error(
        '[Categories Service] Get liquor categories failed:',
        error,
      );
      return [];
    }
  }

  /**
   * Get category hierarchy
   */
  async getCategoryHierarchy(): Promise<Category[]> {
    try {
      return await this.cellerHutCategoriesService.getCategoryHierarchy();
    } catch (error) {
      console.error(
        '[Categories Service] Get category hierarchy failed:',
        error,
      );
      return [];
    }
  }

  /**
   * Get categories by liquor type
   */
  async getCategoriesByType(liquorType: string): Promise<Category[]> {
    try {
      return await this.cellerHutCategoriesService.getCategoriesByType(
        liquorType,
      );
    } catch (error) {
      console.error(
        '[Categories Service] Get categories by type failed:',
        error,
      );
      return [];
    }
  }

  /**
   * Search categories with advanced filters
   */
  async searchCategories(
    searchQuery: string,
    filters: any = {},
  ): Promise<Category[]> {
    try {
      return await this.cellerHutCategoriesService.searchCategories(
        searchQuery,
        filters,
      );
    } catch (error) {
      console.error('[Categories Service] Search categories failed:', error);
      return [];
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(categoryId: number): Promise<any> {
    try {
      return await this.cellerHutCategoriesService.getCategoryStats(categoryId);
    } catch (error) {
      console.error('[Categories Service] Get category stats failed:', error);
      return {
        total_products: 0,
        active_products: 0,
        average_price: 0,
        price_range: { min: 0, max: 0 },
        subcategories_count: 0,
      };
    }
  }
}
