import { BusinessError, NotFoundError } from "@/server/errors";
import { professionalRepository } from "@/server/repositories/professional.repository";
import { type ProfessionalInput } from "@/lib/validations/professional";

function normalize(input: ProfessionalInput) {
  return {
    name: input.name,
    specialty: input.specialty ? input.specialty : null,
    bio: input.bio ? input.bio : null,
    active: input.active,
  };
}

export const professionalService = {
  list: () => professionalRepository.list(),
  listActive: () => professionalRepository.listActive(),

  async getById(id: string) {
    const professional = await professionalRepository.findById(id);
    if (!professional) throw new NotFoundError("El profesional");
    return professional;
  },

  getByIdWithAvailability(id: string) {
    return professionalRepository.findByIdWithAvailability(id);
  },

  create(input: ProfessionalInput) {
    return professionalRepository.create(normalize(input));
  },

  async update(id: string, input: ProfessionalInput) {
    await this.getById(id);
    return professionalRepository.update(id, normalize(input));
  },

  async remove(id: string) {
    await this.getById(id);
    const activeCount = await professionalRepository.countActiveAppointments(id);
    if (activeCount > 0) {
      throw new BusinessError(
        "El profesional tiene turnos activos a futuro. Desactivalo en lugar de eliminarlo.",
      );
    }
    return professionalRepository.delete(id);
  },

  async setActive(id: string, active: boolean) {
    await this.getById(id);
    return professionalRepository.update(id, { active });
  },
};
