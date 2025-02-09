import random
import json

# Grid data
grid_data = json.load(open("prisma/grid_Ksquares.json"))

# Generate random property data
property_types = ["Residential", "Commercial", "Industrial", "Agricultural"]
properties = []

for i in range(1, 101):  # Generate 100 properties
    grid = random.choice(grid_data)
    property_record = {
        "id": i,
        "valor": round(random.uniform(50000, 500000), 2),
        "tipo": random.choice(property_types),
        "id_municipio": random.randint(1, 20),
        "id_barrio": random.randint(1, 50),
        "id_sector": random.randint(1, 30),
        "gridId": grid["usng"],
        "grid": grid
    }
    properties.append(property_record)

# Save to JSON file
with open("prisma/properties.json", "w") as f:
    json.dump(properties, f, indent=4)


print("Generated 100 random properties and saved to properties.json")
