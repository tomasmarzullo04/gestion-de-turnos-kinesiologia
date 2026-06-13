import { BusinessError, NotFoundError } from "@/server/errors";
import { serviceRepository } from "@/server/repositories/service.repository";
import { type ServiceInput } from "@/lib/validations/service";

function normalize(input: ServiceInput) {
  return {
    name: input.name,
    description: input.description ? input.description : null,
    durationMinutes: input.durationMinutes,
    active: input.active,
  };
}

export const serviceService = {
  list: () => serviceRepository.list(),
  listActive: () => serviceRepository.listActive(),

  async getById(id: string) {
    const service = await serviceRepository.findById(id);
    if (!service) throw new NotFoundError("El servicio");
    return service;
  },

  create(input: ServiceInput) {
    return serviceRepository.create(normalize(input));
  },

  async update(id: string, input: ServiceInput) {
    await this.getById(id);
    return serviceRepository.update(id, normalize(input));
  },

  /**
   * Elimina un servicio. Si tiene turnos activos a futuro, no se borra: se
   * desactiva para preservar el historial y no romper turnos existentes.
   */
  async remove(id: string) {
    await this.getById(id);
    const activeCount = await serviceRepository.countActiveAppointments(id);
    if (activeCount > 0) {
      throw new BusinessError(
        "El servicio tiene turnos activos. Se desactivó en lugar de eliminarse.",
      );
    }
    return serviceRepository.delete(id);
  },

  async setActive(id: string, active: boolean) {
    await this.getById(id);
    return serviceRepository.update(id, { active });
  },
};
