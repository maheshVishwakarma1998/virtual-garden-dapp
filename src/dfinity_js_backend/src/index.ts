import {
    $query,
    $update,
    Record,
    StableBTreeMap,
    Vec,
    match,
    Result,
    nat64,
    ic,
    Opt,
    Principal,
  } from "azle";
  import { v4 as uuidv4 } from "uuid";
  
  type Garden = Record<{
    id: string;
    name: string;
    location: string;
    owner: Principal;
    plants: Vec<string>;
    image: string;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
  }>;
  
  type GardenPayload = Record<{
    name: string;
    location: string;
    plants: Vec<string>;
    image: string;
  }>;
  

  // garder is a bets place
  const gardenStorage = new StableBTreeMap<string, Garden>(0, 44, 1024);
  
  $update;
  export function createGarden(payload: GardenPayload): Result<Garden, string> {
    if (!payload.name || !payload.location || !payload.plants || !payload.image) {
      // Payload Validation: Check if required fields in the payload are missing
      return Result.Err<Garden, string>("Missing required fields in payload");
    }
  
    const garden: Garden = {
      id: uuidv4(),
      createdAt: ic.time(),
      updatedAt: Opt.None,
      owner: ic.caller(),
      name: payload.name,
      location: payload.location,
      plants: payload.plants,
      image: payload.image,
    };
  
    try {
      // Error Handling: Handle potential errors during garden insertion
      gardenStorage.insert(garden.id, garden);
    } catch (error) {
      return Result.Err<Garden, string>("Error occurred during garden insertion");
    }
  
    return Result.Ok<Garden, string>(garden);
  }
  
  $query;
  export function getGarden(id: string): Result<Garden, string> {
    if (!id) {
      // Parameter Validation: Check if ID is invalid or missing
      return Result.Err<Garden, string>(`Invalid id=${id}.`);
    }
  
    try {
      return match(gardenStorage.get(id), {
        Some: (g) => Result.Ok<Garden, string>(g),
        None: () => Result.Err<Garden, string>(`Garden with id=${id} not found.`),
      });
    } catch (error) {
      return Result.Err<Garden, string>(`Error while retrieving garden with id ${id}`);
    }
  }
  
  $query;
  export function getAllGardens(): Result<Vec<Garden>, string> {
    try {
      return Result.Ok(gardenStorage.values());
    } catch (error) {
      return Result.Err(`Failed to get all gardens: ${error}`);
    }
  }
  
  $update;
  export function updateGarden(id: string, payload: GardenPayload): Result<Garden, string> {
    if (!id) {
      // Parameter Validation: Check if ID is invalid or missing
      return Result.Err<Garden, string>('Invalid id.');
    }
  
    if (!payload.name || !payload.location || !payload.plants || !payload.image) {
      // Payload Validation: Check if required fields in the payload are missing
      return Result.Err<Garden, string>('Missing required fields in payload.');
    }
  
    return match(gardenStorage.get(id), {
      Some: (existingGarden) => {
        const updatedGarden: Garden = {
          id: existingGarden.id,
          name: payload.name,
          location: payload.location,
          plants: payload.plants,
          image: payload.image,
          owner: existingGarden.owner,
          createdAt: existingGarden.createdAt,
          updatedAt: Opt.Some(ic.time()),
        };
  
        try {
          // Error Handling: Handle potential errors during garden update
          gardenStorage.insert(updatedGarden.id, updatedGarden);
          return Result.Ok<Garden, string>(updatedGarden);
        } catch (error) {
          return Result.Err<Garden, string>(`Error updating garden: ${error}`);
        }
      },
  
      None: () => Result.Err<Garden, string>(`Garden with id=${id} not found.`),
    });
  }
  
  $update;
  export function deleteGarden(id: string): Result<Garden, string> {
    if (!id) {
      // Parameter Validation: Check if ID is invalid or missing
      return Result.Err<Garden, string>(`Invalid id=${id}.`);
    }
  
    try {
      return match(gardenStorage.get(id), {
        Some: (existingGarden) => {
          // Authorization Check: Check if the caller is the owner of the garden
          if (existingGarden.owner.toString() !== ic.caller.toString()) {
            return Result.Err<Garden, string>("User does not have the right to delete the garden");
          }
  
          // Remove the garden from storage
          gardenStorage.remove(id);
          return Result.Ok<Garden, string>(existingGarden);
        },
        None: () => Result.Err<Garden, string>(`Garden with id=${id} not found.`),
      });
    } catch (error) {
      return Result.Err<Garden, string>(`Error deleting garden with id=${id}: ${error}`);
    }
  }
  
  $update;
  export function addPlantToGarden(gardenId: string, plant: string): Result<Garden, string> {
    if (!gardenId) {
      // Parameter Validation: Check if gardenId is invalid or missing
      return Result.Err<Garden, string>('Invalid gardenId.');
    }
  
    if (!plant) {
      // Payload Validation: Check if the plant parameter is missing
      return Result.Err<Garden, string>('Missing plant parameter.');
    }
  
    return match(gardenStorage.get(gardenId), {
      Some: (garden) => {
        if (!garden.plants.includes(plant)) {
          // Authorization Check: Check if the caller is the owner of the garden
          if (garden.owner.toString() !== ic.caller.toString()) {
            return Result.Err<Garden, string>("User does not have the right to add a plant to the garden");
          }
  
          garden.plants.push(plant);
          garden.updatedAt = Opt.Some(ic.time());
  
          try {
            // Error Handling: Handle potential errors during the garden update
            gardenStorage.insert(garden.id, garden);
            return Result.Ok<Garden, string>(garden);
          } catch (error) {
            return Result.Err<Garden, string>(`Error adding plant to garden: ${error}`);
          }
        } else {
          return Result.Err<Garden, string>(`Plant '${plant}' is already in the garden.`);
        }
      },
      None: () => Result.Err<Garden, string>(`Garden with id=${gardenId} not found.`),
    });
  }
  
  $update;
  export function removePlantFromGarden(gardenId: string, plant: string): Result<Garden, string> {
    if (!gardenId) {
      // Parameter Validation: Check if gardenId is invalid or missing
      return Result.Err<Garden, string>('Invalid gardenId.');
    }
  
    if (!plant) {
      // Payload Validation: Check if the plant parameter is missing
      return Result.Err<Garden, string>('Missing plant parameter.');
    }
  
    return match(gardenStorage.get(gardenId), {
      Some: (garden) => {
        if (garden.plants.includes(plant)) {
          // Authorization Check: Check if the caller is the owner of the garden
          if (garden.owner.toString() !== ic.caller.toString()) {
            return Result.Err<Garden, string>("User does not have the right to remove a plant from the garden");
          }
  
          const plantIndex = garden.plants.indexOf(plant);
          garden.plants.splice(plantIndex, 1);
          garden.updatedAt = Opt.Some(ic.time());
  
          try {
            // Error Handling: Handle potential errors during the garden update
            gardenStorage.insert(garden.id, garden);
            return Result.Ok<Garden, string>(garden);
          } catch (error) {
            return Result.Err<Garden, string>(`Error removing plant from garden: ${error}`);
          }
        } else {
          return Result.Err<Garden, string>(`Plant '${plant}' is not in the garden.`);
        }
      },
      None: () => Result.Err<Garden, string>(`Garden with id=${gardenId} not found.`),
    });
  }
  
  $query;
  export function listPlantsInGarden(gardenId: string): Result<Vec<string>, string> {
    if (!gardenId) {
      // Parameter Validation: Check if gardenId is invalid or missing
      return Result.Err<Vec<string>, string>('Invalid gardenId.');
    }
  
    try {
      return match(gardenStorage.get(gardenId), {
        Some: (garden) => Result.Ok<Vec<string>, string>(garden.plants),
        None: () => Result.Err<Vec<string>, string>(`Garden with id=${gardenId} not found.`),
      });
    } catch (error) {
      return Result.Err<Vec<string>, string>(`Error while listing plants in garden with id ${gardenId}`);
    }
  }
  
  $update;
  export function updateGardenImage(gardenId: string, newImage: string): Result<Garden, string> {
  return match(gardenStorage.get(gardenId), {
    Some: (garden) => {
      garden.image = newImage;
      garden.updatedAt = Opt.Some(ic.time());
      gardenStorage.insert(garden.id, garden);
      return Result.Ok<Garden, string>(garden);
    },
    None: () => Result.Err<Garden, string>(`Garden with id=${gardenId} not found.`),
  });
  }
  
  
  
  globalThis.crypto = {
    //@ts-ignore
    getRandomValues: () => {
      let array = new Uint8Array(32);
  
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
  
      return array;
    },
  };
  
  