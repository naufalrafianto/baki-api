import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BaseRepository<T> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly modelName: string,
  ) {}

  async findAll(args: any = {}): Promise<T[]> {
    const model = this.prisma[this.modelName];
    return model.findMany(args);
  }

  async findOne(args: any = {}): Promise<T | null> {
    const model = this.prisma[this.modelName];
    return model.findFirst(args);
  }

  async findById(id: string, args: any = {}): Promise<T | null> {
    const model = this.prisma[this.modelName];
    return model.findUnique({
      ...args,
      where: { id },
    });
  }

  async create(data: any, args: any = {}): Promise<T> {
    const model = this.prisma[this.modelName];
    return model.create({
      ...args,
      data,
    });
  }

  async update(id: string, data: any, args: any = {}): Promise<T> {
    const model = this.prisma[this.modelName];
    return model.update({
      ...args,
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<T> {
    const model = this.prisma[this.modelName];
    return model.delete({
      where: { id },
    });
  }

  async count(args: any = {}): Promise<number> {
    const model = this.prisma[this.modelName];
    return model.count(args);
  }
}
