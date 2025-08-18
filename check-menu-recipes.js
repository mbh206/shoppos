const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMenuRecipes() {
  try {
    // Get all menu items with their recipes
    const menuItems = await prisma.menuItem.findMany({
      include: {
        ingredients: {
          include: {
            ingredient: true
          }
        },
        category: true
      },
      orderBy: { name: 'asc' }
    });

    console.log('\n=== MENU ITEMS RECIPE STATUS ===\n');
    
    const withRecipes = [];
    const withoutRecipes = [];
    const lowStock = [];
    const outOfStock = [];

    for (const item of menuItems) {
      if (item.ingredients.length === 0) {
        withoutRecipes.push(item);
      } else {
        withRecipes.push(item);
        
        // Check stock levels
        let hasLowStock = false;
        let hasOutOfStock = false;
        
        for (const recipe of item.ingredients) {
          if (!recipe.isOptional) {
            if (recipe.ingredient.stockQuantity === 0) {
              hasOutOfStock = true;
            } else if (recipe.ingredient.stockQuantity < recipe.quantity * 5) {
              hasLowStock = true;
            }
          }
        }
        
        if (hasOutOfStock) {
          outOfStock.push(item);
        } else if (hasLowStock) {
          lowStock.push(item);
        }
      }
    }

    console.log(`📊 Total Menu Items: ${menuItems.length}`);
    console.log(`✅ With Recipes: ${withRecipes.length}`);
    console.log(`❌ Without Recipes: ${withoutRecipes.length}`);
    console.log(`⚠️  Low Stock Items: ${lowStock.length}`);
    console.log(`🚫 Out of Stock Items: ${outOfStock.length}`);

    if (withoutRecipes.length > 0) {
      console.log('\n📝 Items WITHOUT Recipes (will not track inventory):');
      console.log('─'.repeat(50));
      withoutRecipes.forEach(item => {
        console.log(`  • ${item.name} (${item.category?.name || 'No category'})`);
      });
    }

    if (withRecipes.length > 0) {
      console.log('\n✅ Items WITH Recipes:');
      console.log('─'.repeat(50));
      withRecipes.forEach(item => {
        console.log(`\n  📦 ${item.name}:`);
        item.ingredients.forEach(recipe => {
          const stock = recipe.ingredient.stockQuantity;
          const needed = recipe.quantity;
          const canMake = Math.floor(stock / needed);
          const stockStatus = stock === 0 ? '🚫' : stock < needed * 5 ? '⚠️' : '✅';
          
          console.log(`     ${stockStatus} ${recipe.ingredient.name}: ${stock}/${needed} ${recipe.ingredient.unit} (can make ${canMake} servings)`);
        });
      });
    }

    if (outOfStock.length > 0) {
      console.log('\n🚫 OUT OF STOCK Items (cannot be ordered):');
      console.log('─'.repeat(50));
      outOfStock.forEach(item => {
        console.log(`  • ${item.name}`);
        item.ingredients.forEach(recipe => {
          if (!recipe.isOptional && recipe.ingredient.stockQuantity === 0) {
            console.log(`    ❌ ${recipe.ingredient.name}: 0 ${recipe.ingredient.unit}`);
          }
        });
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMenuRecipes();