import { timeToMinutes } from "@/lib/datetime";
import { BusinessError } from "@/server/errors";
import { availabilityRepository } from "@/server/repositories/availability.repository";
import { professionalService } from "@/server/services/professional.service";
import { type AvailabilityInput } from "@/lib/validations/availability";

export const availabilityService = {
  listByProfessional: (professionalId: string) =>
    availabilityRepository.listByProfessional(professionalId),

  async create(input: AvailabilityInput) {
    // Verificar que el profesional exista.
    await professionalService.getById(input.professionalId);

    // Evitar franjas solapadas el mismo día para el mismo profesional.
    const sameDay = await availabilityRepository.listByProfessionalAndDay(
      input.professionalId,
      input.dayOfWeek,
    );
    const newStart = timeToMinutes(input.startTime);
    const newEnd = timeToMinutes(input.endTime);

    const overlaps = sameDay.some((slot) => {
      const start = timeToMinutes(slot.startTime);
      const end = timeToMinutes(slot.endTime);
      return newStart < end && newEnd > start;
    });
    if (overlaps) {
      throw new BusinessError(
        "La franja se superpone con otra ya existente ese día.",
      );
    }

    return availabilityRepository.create(input);
  },

  async remove(id: string) {
    const existing = await availabilityRepository.findById(id);
    if (!existing) {
      throw new BusinessError("La franja horaria no existe.");
    }
    return availabilityRepository.delete(id);
  },
};
