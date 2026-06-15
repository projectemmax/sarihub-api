import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
    constructor(
        private readonly brandsService: BrandsService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Get all brands',
    })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
    })
    @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    })
    @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    })

    findAll(@Query() query: QueryBrandDto) {
        return this.brandsService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get brand by id',
    })

    @ApiParam({
        name: 'id',
    })
    findOne(@Param('id') id: string) {
        return this.brandsService.findOne(id);
    }

    @Post()
    @ApiOperation({
        summary: 'Create brand',
    })
    create(
        @Body() createBrandDto: CreateBrandDto,
    ) {
        return this.brandsService.create(
        createBrandDto,
        );
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Update brand',
    })
    update(
        @Param('id') id: string,
        @Body() updateBrandDto: UpdateBrandDto,
    ) {
        return this.brandsService.update(
        id,
        updateBrandDto,
        );
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Soft delete brand',
    })
    remove(@Param('id') id: string) {
        return this.brandsService.remove(id);
    }
}