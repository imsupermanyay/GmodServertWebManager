import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, UseInterceptors, UploadedFile, Res, StreamableFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { InstancesService } from './instances.service';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('instances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createInstanceDto: CreateInstanceDto) {
    return this.instancesService.create(createInstanceDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.instancesService.findAll(req.user.id, req.user.role);
  }

  @Get('links/instances')
  @Roles(UserRole.SUPER_ADMIN)
  listInstanceLinks() {
    return this.instancesService.listHostInstanceLinks();
  }

  @Get('links/gamemodes')
  @Roles(UserRole.SUPER_ADMIN)
  listGamemodes() {
    return this.instancesService.listGamemodes();
  }

  @Post('links/bind')
  @Roles(UserRole.SUPER_ADMIN)
  bindInstanceToMode(@Body() body: { instanceName: string; modeName: string }) {
    return this.instancesService.bindInstanceToGamemode(body.instanceName, body.modeName);
  }

  @Post('links/unbind')
  @Roles(UserRole.SUPER_ADMIN)
  unbindInstance(@Body() body: { instanceName: string }) {
    return this.instancesService.unbindInstanceLink(body.instanceName);
  }

  @Get('my')
  @Roles(UserRole.ADMIN)
  getMyInstances(@Request() req) {
    return this.instancesService.getMyInstances(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.instancesService.findOne(+id, req.user.id, req.user.role);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInstanceDto: UpdateInstanceDto, @Request() req) {
    return this.instancesService.update(+id, updateInstanceDto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.instancesService.remove(+id);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @Request() req) {
    return this.instancesService.start(+id, req.user.id, req.user.role);
  }

  @Post(':id/stop')
  stop(@Param('id') id: string, @Request() req) {
    return this.instancesService.stop(+id, req.user.id, req.user.role);
  }

  @Post(':id/restart')
  restart(@Param('id') id: string, @Request() req) {
    return this.instancesService.restart(+id, req.user.id, req.user.role);
  }

  @Post(':id/server/start')
  startServer(@Param('id') id: string, @Request() req) {
    return this.instancesService.startServer(+id, req.user.id, req.user.role);
  }

  @Post(':id/server/stop')
  stopServer(@Param('id') id: string, @Request() req) {
    return this.instancesService.stopServer(+id, req.user.id, req.user.role);
  }

  @Post(':id/server/restart')
  restartServer(@Param('id') id: string, @Request() req) {
    return this.instancesService.restartServer(+id, req.user.id, req.user.role);
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string, @Request() req, @Query('since') since?: string) {
    const sinceValue = since !== undefined ? Number(since) : undefined;
    const normalizedSince =
      sinceValue !== undefined && !Number.isNaN(sinceValue) ? sinceValue : undefined;

    return this.instancesService.getLogs(+id, req.user.id, req.user.role, normalizedSince);
  }

  @Get(':id/info')
  getInfo(@Param('id') id: string, @Request() req) {
    return this.instancesService.getInstanceInfo(+id, req.user.id, req.user.role);
  }

  @Post(':id/exec')
  execCommand(@Param('id') id: string, @Body() body: { command: string }, @Request() req) {
    return this.instancesService.execCommand(+id, body.command, req.user.id, req.user.role);
  }

  // 文件管理相关接口
  @Get(':id/files')
  listFiles(@Param('id') id: string, @Query('path') path: string, @Request() req) {
    return this.instancesService.listFiles(+id, path || '', req.user.id, req.user.role);
  }

  @Post(':id/files/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @Param('id') id: string,
    @Query('path') path: string,
    @UploadedFile() file: any,
    @Request() req
  ) {
    return this.instancesService.uploadFile(+id, path || '', file, req.user.id, req.user.role);
  }

  @Get(':id/files/download')
  async downloadFile(
    @Param('id') id: string,
    @Query('path') path: string,
    @Request() req,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.instancesService.downloadFile(+id, path, req.user.id, req.user.role);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
    });
    return new StreamableFile(result.stream);
  }

  @Delete(':id/files')
  deleteFile(@Param('id') id: string, @Query('path') path: string, @Request() req) {
    return this.instancesService.deleteFile(+id, path, req.user.id, req.user.role);
  }
}
