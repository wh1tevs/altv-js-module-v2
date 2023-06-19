#include "Class.h"

// clang-format off
extern js::Class sharedBlipClass;
extern js::Class blipClass("Blip", &sharedBlipClass, nullptr, [](js::ClassTemplate& tpl)
{
    tpl.BindToType(alt::IBaseObject::Type::BLIP);

    tpl.Property<&alt::IBlip::GetGameID>("scriptID");
    tpl.Property<&alt::IBlip::IsVisible, &alt::IBlip::SetVisible>("visible");

    tpl.GetByID<alt::IBaseObject::Type::BLIP>();
});
