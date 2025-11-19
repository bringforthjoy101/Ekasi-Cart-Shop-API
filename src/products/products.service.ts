import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsDto, ProductPaginator } from './dto/get-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { paginate } from 'src/common/pagination/paginate';
import productsJson from '@db/products.json';
import popularProductsJson from '@db/popular-products.json';
import bestSellingProductsJson from '@db/best-selling-products.json';
import Fuse from 'fuse.js';
import { GetPopularProductsDto } from './dto/get-popular-products.dto';
import { GetBestSellingProductsDto } from './dto/get-best-selling-products.dto';
import { CellerHutProductsService } from './celler-hut-products.service';

const products = plainToClass(Product, productsJson);
const popularProducts = plainToClass(Product, popularProductsJson);
const bestSellingProducts = plainToClass(Product, bestSellingProductsJson);

const options = {
  keys: [
    'name',
    'type.slug',
    'categories.slug',
    'status',
    'shop_id',
    'author.slug',
    'tags',
    'manufacturer.slug',
    'visibility',
  ],
  threshold: 0.3,
};
const fuse = new Fuse(products, options);

@Injectable()
export class ProductsService {
  private products: any = products;
  private popularProducts: any = popularProducts;
  private bestSellingProducts: any = bestSellingProducts;

  constructor(private cellerHutProductsService: CellerHutProductsService) {}

  create() {
    return this.products[0];
  }

  async getProducts({
    limit,
    page,
    search,
  }: GetProductsDto): Promise<ProductPaginator> {
    // Use Ekasi Cart API for product data
    try {
      return await this.cellerHutProductsService.getProducts({
        limit,
        page,
        search,
      });
    } catch (error) {
      console.error(
        '[Products Service] Ekasi Cart API failed, falling back to local data:',
        error,
      );

      // Fallback to local data if Ekasi Cart API fails
      if (!page) page = 1;
      if (!limit) limit = 30;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      let data: Product[] = this.products;

      const parseSearchParams = search ? search.split(';') : [];
      const exactFilters: { [key: string]: any } = {};
      const fuzzyFilters: any[] = [];

      for (const searchParam of parseSearchParams) {
        const [key, value] = searchParam.split(':');

        if (key === 'shop_id') {
          exactFilters.shop_id = parseInt(value, 10);
        } else if (key !== 'slug') {
          fuzzyFilters.push({ [key]: value });
        }
      }
      if (exactFilters.shop_id) {
        data = data.filter(
          (product) => product.shop.id === exactFilters.shop_id,
        );
      }

      if (fuzzyFilters.length) {
        data = fuse
          .search({
            $and: fuzzyFilters,
          })
          ?.map(({ item }) => item);
      }

      const results = data.slice(startIndex, endIndex);
      const url = `/products?search=${search}&limit=${limit}`;
      return {
        data: results,
        ...paginate(data.length, page, limit, results.length, url),
      };
    }
  }

  async getProductBySlug(slug: string): Promise<any> {
    // Use Ekasi Cart API for product data
    try {
      return await this.cellerHutProductsService.getProductBySlug(slug);
    } catch (error) {
      console.error(
        '[Products Service] Ekasi Cart API failed, falling back to local data:',
        error,
      );

      // Fallback to local data if Ekasi Cart API fails
      const product = this.products.find((p) => p.slug === slug);
      if (!product) {
        throw new Error(`Product with slug "${slug}" not found`);
      }

      const related_products = this.products
        .filter((p) => p.type.slug === product.type.slug)
        .slice(0, 20);
      return {
        ...product,
        related_products,
      };
    }
  }

  async getPopularProducts({
    limit,
    type_slug,
  }: GetPopularProductsDto): Promise<any[]> {
    // Use Ekasi Cart API for product data
    try {
      return await this.cellerHutProductsService.getPopularProducts({
        limit,
        type_slug,
      });
    } catch (error) {
      console.error(
        '[Products Service] Ekasi Cart API failed, falling back to local data:',
        error,
      );

      // Fallback to local data if Ekasi Cart API fails
      let data: any = this.popularProducts;
      if (type_slug) {
        data = fuse.search(type_slug)?.map(({ item }) => item);
      }
      return data?.slice(0, limit);
    }
  }
  getBestSellingProducts({
    limit,
    type_slug,
  }: GetBestSellingProductsDto): Product[] {
    let data: any = this.bestSellingProducts;
    if (type_slug) {
      data = fuse.search(type_slug)?.map(({ item }) => item);
    }
    return data?.slice(0, limit);
  }

  getProductsStock({ limit, page, search }: GetProductsDto): ProductPaginator {
    if (!page) page = 1;
    if (!limit) limit = 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    let data: Product[] = this.products.filter((item) => item.quantity <= 9);

    if (search) {
      const parseSearchParams = search.split(';');
      const searchText: any = [];
      for (const searchParam of parseSearchParams) {
        const [key, value] = searchParam.split(':');
        // TODO: Temp Solution
        if (key !== 'slug') {
          searchText.push({
            [key]: value,
          });
        }
      }

      data = fuse
        .search({
          $and: searchText,
        })
        ?.map(({ item }) => item);
    }

    const results = data.slice(startIndex, endIndex);
    const url = `/products-stock?search=${search}&limit=${limit}`;
    return {
      data: results,
      ...paginate(data.length, page, limit, results.length, url),
    };
  }

  getDraftProducts({ limit, page, search }: GetProductsDto): ProductPaginator {
    if (!page) page = 1;
    if (!limit) limit = 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    let data: Product[] = this.products.filter(
      (item) => item.status === 'draft',
    );

    if (search) {
      const parseSearchParams = search.split(';');
      const searchText: any = [];
      for (const searchParam of parseSearchParams) {
        const [key, value] = searchParam.split(':');
        // TODO: Temp Solution
        if (key !== 'slug') {
          searchText.push({
            [key]: value,
          });
        }
      }

      data = fuse
        .search({
          $and: searchText,
        })
        ?.map(({ item }) => item);
    }

    const results = data.slice(startIndex, endIndex);
    const url = `/draft-products?search=${search}&limit=${limit}`;
    return {
      data: results,
      ...paginate(data.length, page, limit, results.length, url),
    };
  }

  update() {
    return this.products[0];
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
