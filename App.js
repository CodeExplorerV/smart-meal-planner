import React, { useState, useEffect } from 'react';
import './App.css';
import { Search, Calendar, ShoppingCart, Heart, Clock, Users, Star, Plus, X, ChefHat, Utensils, Trash2 } from 'lucide-react';

const API_KEY = 'eeae46ddaa434b308baf1a035568962e';
const BASE_URL = 'https://api.spoonacular.com';

const SmartMealPlanner = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [recipes, setRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState({
    monday: { breakfast: null, lunch: null, dinner: null },
    tuesday: { breakfast: null, lunch: null, dinner: null },
    wednesday: { breakfast: null, lunch: null, dinner: null },
    thursday: { breakfast: null, lunch: null, dinner: null },
    friday: { breakfast: null, lunch: null, dinner: null },
    saturday: { breakfast: null, lunch: null, dinner: null },
    sunday: { breakfast: null, lunch: null, dinner: null }
  });
  const [favorites, setFavorites] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [recipeToAdd, setRecipeToAdd] = useState(null);
  const [dietaryPreferences, setDietaryPreferences] = useState({
    diet: '',
    intolerances: '',
    maxReadyTime: 60
  });

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];

  // Search recipes - Fixed the error
  const searchRecipes = async (query) => {
    const searchTerm = query || searchQuery;
    
    if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
      console.log('No valid search term provided');
      return;
    }
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        apiKey: API_KEY,
        query: searchTerm.trim(),
        number: 12,
        addRecipeInformation: true,
        fillIngredients: true,
        diet: dietaryPreferences.diet,
        intolerances: dietaryPreferences.intolerances,
        maxReadyTime: dietaryPreferences.maxReadyTime
      });

      const response = await fetch(`${BASE_URL}/recipes/complexSearch?${params}`);
      const data = await response.json();
      setRecipes(data.results || []);
    } catch (error) {
      console.error('Error searching recipes:', error);
    }
    setLoading(false);
  };

  // Get recipe details
  const getRecipeDetails = async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/recipes/${id}/information?apiKey=${API_KEY}`);
      const data = await response.json();
      setSelectedRecipe(data);
    } catch (error) {
      console.error('Error fetching recipe details:', error);
    }
  };

  // Add recipe to meal plan
  const addToMealPlan = (recipe, day, mealType) => {
    setMealPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: recipe
      }
    }));
    setShowMealSelector(false);
    setRecipeToAdd(null);
  };

  // Remove recipe from meal plan
  const removeFromMealPlan = (day, mealType) => {
    setMealPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: null
      }
    }));
  };

  // Generate shopping list based on custom meal plan
  const generateShoppingList = async () => {
    const recipeIds = [];
    
    // Collect all recipe IDs from the meal plan
    Object.values(mealPlan).forEach(day => {
      Object.values(day).forEach(meal => {
        if (meal && meal.id) {
          recipeIds.push(meal.id);
        }
      });
    });

    if (recipeIds.length === 0) {
      alert('Please add some recipes to your meal plan first!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/recipes/informationBulk?apiKey=${API_KEY}&ids=${recipeIds.join(',')}`);
      const recipesData = await response.json();
      
      const ingredients = [];
      recipesData.forEach(recipe => {
        if (recipe.extendedIngredients) {
          recipe.extendedIngredients.forEach(ing => {
            const existing = ingredients.find(i => i.name === ing.name);
            if (existing) {
              existing.amount += ing.amount || 0;
            } else {
              ingredients.push({
                name: ing.name,
                amount: ing.amount || 1,
                unit: ing.unit || '',
                aisle: ing.aisle || 'Other'
              });
            }
          });
        }
      });
      
      setShoppingList(ingredients);
    } catch (error) {
      console.error('Error generating shopping list:', error);
    }
    setLoading(false);
  };

  // Generate automatic meal plan
  const generateAutoMealPlan = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        apiKey: API_KEY,
        timeFrame: 'week',
        targetCalories: 2000,
        diet: dietaryPreferences.diet,
        exclude: dietaryPreferences.intolerances
      });

      const response = await fetch(`${BASE_URL}/mealplanner/generate?${params}`);
      const data = await response.json();
      
      // Convert the API response to our meal plan format
      if (data.week) {
        const newMealPlan = {};
        Object.entries(data.week).forEach(([day, dayData]) => {
          newMealPlan[day] = {
            breakfast: dayData.meals?.[0] || null,
            lunch: dayData.meals?.[1] || null,
            dinner: dayData.meals?.[2] || null
          };
        });
        setMealPlan(newMealPlan);
      }
    } catch (error) {
      console.error('Error generating meal plan:', error);
    }
    setLoading(false);
  };

  // Toggle favorite
  const toggleFavorite = (recipe) => {
    setFavorites(prev => {
      const isFavorite = prev.find(f => f.id === recipe.id);
      if (isFavorite) {
        return prev.filter(f => f.id !== recipe.id);
      } else {
        return [...prev, recipe];
      }
    });
  };

  // Show meal selector modal
  const showAddToMealModal = (recipe) => {
    setRecipeToAdd(recipe);
    setShowMealSelector(true);
  };

  const RecipeCard = ({ recipe, compact = false }) => (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ${compact ? 'h-64' : 'h-80'}`}>
      <div className="relative h-48 overflow-hidden">
        <img 
          src={recipe.image || '/api/placeholder/300/200'} 
          alt={recipe.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
        <button
          onClick={() => toggleFavorite(recipe)}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-colors ${
            favorites.find(f => f.id === recipe.id) 
              ? 'bg-red-500 text-white' 
              : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white'
          }`}
        >
          <Heart size={16} fill={favorites.find(f => f.id === recipe.id) ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{recipe.title}</h3>
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{recipe.readyInMinutes}min</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{recipe.servings} servings</span>
          </div>
          {recipe.spoonacularScore && (
            <div className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500" />
              <span>{Math.round(recipe.spoonacularScore)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => getRecipeDetails(recipe.id)}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-sm"
          >
            View Recipe
          </button>
          <button
            onClick={() => showAddToMealModal(recipe)}
            className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const MealSelectorModal = () => {
    if (!showMealSelector || !recipeToAdd) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add to Meal Plan</h3>
              <button
                onClick={() => setShowMealSelector(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">{recipeToAdd.title}</h4>
              <p className="text-sm text-gray-600">Select when you'd like to have this meal:</p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {daysOfWeek.map(day => (
                <div key={day} className="border rounded-lg p-3">
                  <h5 className="font-medium capitalize mb-2">{day}</h5>
                  <div className="grid grid-cols-3 gap-2">
                    {mealTypes.map(mealType => (
                      <button
                        key={mealType}
                        onClick={() => addToMealPlan(recipeToAdd, day, mealType)}
                        disabled={mealPlan[day][mealType] !== null}
                        className={`p-2 text-sm rounded-lg transition-colors ${
                          mealPlan[day][mealType] !== null
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {mealType}
                        {mealPlan[day][mealType] && (
                          <div className="text-xs mt-1">Occupied</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RecipeModal = () => {
    if (!selectedRecipe) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{selectedRecipe.title}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => showAddToMealModal(selectedRecipe)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add to Meal
              </button>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <img 
                  src={selectedRecipe.image} 
                  alt={selectedRecipe.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
                <div className="flex gap-4 mt-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{selectedRecipe.readyInMinutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>{selectedRecipe.servings} servings</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-3">Ingredients:</h3>
                <ul className="space-y-2 mb-6">
                  {selectedRecipe.extendedIngredients?.map((ing, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span>{ing.original}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {selectedRecipe.summary && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-3">Summary:</h3>
                <div 
                  className="text-gray-700 prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedRecipe.summary }}
                />
              </div>
            )}
            
            {selectedRecipe.instructions && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-3">Instructions:</h3>
                <div 
                  className="text-gray-700 prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedRecipe.instructions }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ChefHat className="w-12 h-12 text-green-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Smart Meal Planner
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Discover, plan, and organize your perfect meals</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { id: 'search', label: 'Recipe Search', icon: Search },
            { id: 'planner', label: 'Meal Planner', icon: Calendar },
            { id: 'favorites', label: 'Favorites', icon: Heart },
            { id: 'shopping', label: 'Shopping List', icon: ShoppingCart }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-green-50 hover:text-green-600'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Recipe Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search for recipes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchRecipes()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <button
                  onClick={() => searchRecipes()}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
                >
                  <Search size={18} />
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <select
                  value={dietaryPreferences.diet}
                  onChange={(e) => setDietaryPreferences(prev => ({ ...prev, diet: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Any Diet</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="ketogenic">Keto</option>
                  <option value="paleo">Paleo</option>
                </select>
                
                <input
                  type="text"
                  placeholder="Intolerances (e.g., dairy, gluten)"
                  value={dietaryPreferences.intolerances}
                  onChange={(e) => setDietaryPreferences(prev => ({ ...prev, intolerances: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                
                <input
                  type="number"
                  placeholder="Max prep time (min)"
                  value={dietaryPreferences.maxReadyTime}
                  onChange={(e) => setDietaryPreferences(prev => ({ ...prev, maxReadyTime: parseInt(e.target.value) || 60 }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Searching for delicious recipes...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recipes.map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Meal Planner Tab */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Weekly Meal Plan</h2>
                <div className="flex gap-3">
                  <button
                    onClick={generateAutoMealPlan}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
                  >
                    <Calendar size={18} />
                    {loading ? 'Generating...' : 'Auto Generate'}
                  </button>
                  <button
                    onClick={() => setMealPlan({
                      monday: { breakfast: null, lunch: null, dinner: null },
                      tuesday: { breakfast: null, lunch: null, dinner: null },
                      wednesday: { breakfast: null, lunch: null, dinner: null },
                      thursday: { breakfast: null, lunch: null, dinner: null },
                      friday: { breakfast: null, lunch: null, dinner: null },
                      saturday: { breakfast: null, lunch: null, dinner: null },
                      sunday: { breakfast: null, lunch: null, dinner: null }
                    })}
                    className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {daysOfWeek.map(day => (
                  <div key={day} className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3 capitalize text-center">{day}</h3>
                    <div className="space-y-3">
                      {mealTypes.map(mealType => (
                        <div key={mealType} className="bg-white rounded-lg p-3 min-h-[100px]">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm text-gray-600 capitalize">{mealType}</h4>
                            {mealPlan[day][mealType] && (
                              <button
                                onClick={() => removeFromMealPlan(day, mealType)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          {mealPlan[day][mealType] ? (
                            <div className="cursor-pointer" onClick={() => getRecipeDetails(mealPlan[day][mealType].id)}>
                              <p className="text-sm font-medium hover:text-green-600">{mealPlan[day][mealType].title}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <Clock size={12} />
                                <span>{mealPlan[day][mealType].readyInMinutes}min</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-gray-400 text-sm">
                              <Plus size={20} className="mx-auto mb-1" />
                              Add recipe
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Favorite Recipes</h2>
              
              {favorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {favorites.map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Heart size={48} className="mx-auto mb-4 text-gray-400" />
                  <p>No favorite recipes yet. Start by adding some recipes to your favorites!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shopping List Tab */}
        {activeTab === 'shopping' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Shopping List</h2>
                <button
                  onClick={generateShoppingList}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
                >
                  <ShoppingCart size={18} />
                  {loading ? 'Generating...' : 'Generate List'}
                </button>
              </div>

              {shoppingList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(
                    shoppingList.reduce((groups, item) => {
                      const aisle = item.aisle || 'Other';
                      if (!groups[aisle]) groups[aisle] = [];
                      groups[aisle].push(item);
                      return groups;
                    }, {})
                  ).map(([aisle, items]) => (
                    <div key={aisle} className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-3 text-gray-800">{aisle}</h3>
                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white rounded p-2">
                            <span className="text-sm">{item.name}</span>
                            <span className="text-xs text-gray-500">
                              {Math.round(item.amount * 100) / 100} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-4 text-gray-400" />
                  <p>Add recipes to your meal plan, then generate your shopping list!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <RecipeModal />
      <MealSelectorModal />
    </div>
  );
};

export default SmartMealPlanner;