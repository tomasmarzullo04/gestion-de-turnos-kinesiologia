import { hash } from "bcryptjs";

import { ROLES } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { userRepository } from "@/server/repositories/user.repository";
import { type RegisterInput } from "@/lib/validations/auth";

const SALT_ROUNDS = 12;

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super("Ya existe una cuenta con ese email");
    this.name = "EmailAlreadyInUseError";
  }
}

export const authService = {
  /**
   * Registra un nuevo paciente. El rol siempre es PATIENT: las cuentas ADMIN se
   * crean por seed o por otro admin, nunca desde el registro público.
   */
  async registerPatient(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await hash(input.password, SALT_ROUNDS);

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: ROLES.PATIENT,
      phone: input.phone ? input.phone : null,
      tipoCoberturaString: input.tipoCobertura,
      obraSocialNombre: input.obraSocialNombre ?? null,
      requiereCopago: input.requiereCopago,
      montoCopago: input.montoCopago ?? null,
      esPrimeraVez: input.esPrimeraVez,
    });

    logger.info("Nuevo paciente registrado", { userId: user.id });

    return { id: user.id, email: user.email };
  },
};
