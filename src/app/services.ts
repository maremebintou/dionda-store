/**
 * Point unique de choix de l'implémentation des services.
 * Phase frontend : services locaux (navigateur).
 * Phase SaaS : remplacer par une fabrique HTTP (voir src/services/http) sans toucher aux écrans.
 */
import { createLocalServices } from '../services/local';
import { browserStore } from '../services/local/storage';
import type { Services } from '../services/contracts';

export const services: Services = createLocalServices(browserStore());
